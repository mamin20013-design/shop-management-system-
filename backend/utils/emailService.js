// ═══════════════════════════════════════════════
//  Email Service — Verification & Transactional
// ═══════════════════════════════════════════════
const nodemailer = require('nodemailer');

let transporter;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;

  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE
  } = process.env;

  // Local dev fallback when no SMTP creds configured.
  // Keeps registration working and logs the verification link instead of
  // trying to authenticate with placeholder SMTP credentials.
  if (!isSmtpConfigured()) {
    console.warn('SMTP credentials not set - using local JSON email transport. Set SMTP_* env vars for production.');
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host:     SMTP_HOST,
    port:     parseInt(SMTP_PORT) || 587,
    secure:   SMTP_SECURE === 'true',
    auth:     { user: SMTP_USER, pass: SMTP_PASS }
  });

  return transporter;
}

// ─── Send Verification Email ──────────────────────
async function sendVerificationEmail({ toEmail, userName, verifyUrl }) {
  if (!toEmail) { throw new Error('Email address is required'); }

  const shopName  = process.env.SHOP_NAME   || 'DukanPro';
  const support   = process.env.SUPPORT_EMAIL || toEmail;
  const expiresIn = parseInt(process.env.VERIFICATION_TOKEN_EXPIRES_IN) || 25;

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <title>Verify Your Email</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; background: #0f1117; color: #f1f5f9; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 16px; }
    .card {
      background: linear-gradient(135deg, #1a1d27 0%, #23263a 100%);
      border: 1px solid rgba(140,130,255,.25);
      border-radius: 18px; padding: 44px 32px 36px;
      text-align: center;
    }
    .logo-icon {
      width: 60px; height: 60px; margin: 0 auto 20px;
      background: rgba(108,99,255,.2);
      border: 1px solid rgba(108,99,255,.5);
      border-radius: 16px; display: flex; align-items: center; justify-content: center;
      font-size: 30px;
    }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 6px; color: #f1f5f9; }
    h2 { font-size: 18px; font-weight: 700; margin-bottom: 10px; color: #a78bfa; }
    .subtitle { font-size: 13px; color: #94a3b8; margin-bottom: 30px; line-height: 1.6; }
    .greeting { font-size: 15px; color: #94a3b8; margin-bottom: 6px; }
    .username { font-size: 20px; font-weight: 700; color: #f1f5f9; margin-bottom: 22px; }
    .btn-verify {
      display: inline-block; background: #6c63ff; color: #ffffff;
      padding: 14px 38px; border-radius: 10px; text-decoration: none;
      font-size: 15px; font-weight: 700; margin: 26px 0 8px;
      box-shadow: 0 4px 20px rgba(108,99,255,.35);
      transition: background .2s;
    }
    .btn-verify:hover { background: #5a52e0; }
    .link-text { font-size: 11px; color: #64748b; word-break: break-all; margin: 12px 0 24px; line-height: 1.7; }
    .expiry-card {
      background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.22);
      border-radius: 10px; padding: 12px 18px; margin: 20px 0;
      font-size: 12px; color: #f59e0b;
    }
    .tips { margin-top: 26px; }
    .tips h3 { font-size: 13px; color: #94a3b8; font-weight: 600; margin-bottom: 10px; }
    .tip-item {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.07);
      border-radius: 8px; padding: 9px 14px;
      font-size: 12px; color: #94a3b8; text-align: left;
      margin-bottom: 6px; line-height: 1.5;
    }
    .tip-item span:first-child { font-size: 15px; flex-shrink: 0; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,.07); font-size: 11px; color: #64748b; line-height: 1.8; }
    .footer a { color: #a78bfa; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo-icon">🛒</div>
      <h1>Welcome to ${escapeHtml(shopName)}</h1>
      <h2>Verify Your Email Address</h2>
      <p class="greeting">Hi,</p>
      <p class="username">${escapeHtml(userName)}</p>
      <p class="subtitle">Thanks for creating an account. Please confirm your email<br>address by clicking the button below.</p>

      <a class="btn-verify" href="${verifyUrl}" target="_blank" rel="noopener noreferrer">
        ✓ Verify My Email
      </a>

      <p class="link-text">Link not working?<br>Copy and paste this into your browser:<br>${escapeHtml(verifyUrl)}</p>

      <div class="expiry-card">
        ⏱&nbsp; This verification link expires in <strong>${escapes(expiresIn)} minutes</strong>.
      </div>

      <div class="tips">
        <h3>Didn't create an account?</h3>
        <div class="tip-item"><span>🗑️</span><span>You can safely ignore this email — no action is required.</span></div>
      </div>

      <div class="footer">
        ${escapeHtml(shopName)} &bull; ${escapeHtml(support)}<br>
        You received this email because someone used this address to register.
      </div>
    </div>
  </div>
</body>
</html>`;

  const text = `Verify Your Email — ${shopName}

Hi ${userName},

Welcome to ${shopName}! Please verify your email by visiting:

${verifyUrl}

This link expires in ${expiresIn} minutes.

If you did not create an account, you can safely ignore this email.`;

  const info = await getTransporter().sendMail({
    from:    process.env.EMAIL_FROM || `"${shopName}" <${process.env.SMTP_USER || 'noreply@example.com'}>`,
    to:      toEmail,
    subject: `Verify your email — ${shopName}`,
    html,
    text
  });

  if (!isSmtpConfigured()) {
    console.log(`Verification email generated for ${toEmail}. Link: ${verifyUrl}`);
  }

  return info;
}

// ─── Helper: Escape HTML ──────────────────────────
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapes(str) { return String(str); }

module.exports = { sendVerificationEmail, getTransporter, isSmtpConfigured };
