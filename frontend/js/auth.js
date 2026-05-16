// ─── Auth Module ───────────────────────────────────────────
const Auth = {
  currentUser: null,

  async init() {
    // ── Email verification page? ─────────────────────
    if (window.location.hash.startsWith('#verify-email')) {
      const query = window.location.hash.includes('?')
        ? window.location.hash.slice(window.location.hash.indexOf('?'))
        : window.location.search;
      const params = new URLSearchParams(query);
      const token  = params.get('token');
      if (token) {
        showAuth('verify');
        handleVerifyToken(token);
        return;
      }
      // No token — show "email sent" pending page
      showAuth('verify');
      showVerifyVariant('pending');
      V_USER.textContent = 'We sent a verification link to your email.';
      V_ICON.textContent = '📧';
      V_SPIN.style.display = 'none';
      initVerifyDoc();
      return;
    }

    // ── Normal auth flow ────────────────────────────
    const token = localStorage.getItem(CONFIG.TOKEN_KEY);
    const user  = localStorage.getItem(CONFIG.USER_KEY);
    if (token && user) {
      try {
        const data = await API.auth.me();
        this.currentUser = data.user;
        localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
        App.startApp();
      } catch (err) {
        this.clearSession();
        showAuth('login');
        if (err?.code === 'EMAIL_NOT_VERIFIED') {
          toast('Please verify your email before logging in.', 'error');
        }
      }
    } else {
      showAuth('login');
    }
  },

  hasPerm(perm) {
    const perms = CONFIG.PERMISSIONS[this.currentUser?.role] || [];
    return perms.includes(perm);
  },

  logout() {
    this.clearSession();
    document.getElementById('main-app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'block';
    showAuthPage('login');
    toast('Logged out successfully');
  },

  clearSession() {
    localStorage.removeItem(CONFIG.TOKEN_KEY);
    localStorage.removeItem(CONFIG.USER_KEY);
    this.currentUser = null;
  }
};

// ─── Show Auth Page ────────────────────────────────────────
function showAuthPage(page) {
  document.getElementById('login-page').style.display    = page === 'login'    ? 'flex' : 'none';
  document.getElementById('register-page').style.display = page === 'register' ? 'flex' : 'none';
}

// ─── Show Auth / Verify wrapper ─────────────────────────────
function showAuth(page) {
  document.getElementById('auth-screen').style.display = page !== 'verify' ? 'block' : 'none';
  document.getElementById('verify-screen').style.display = page === 'verify' ? 'flex' : 'none';
  document.getElementById('login-page').style.display    = page === 'login'    ? 'flex' : 'none';
  document.getElementById('register-page').style.display = page === 'register' ? 'flex' : 'none';
}

// ─── Toggle Password Eye ───────────────────────────────────
function toggleEye(inputId, btn) {
  const inp = document.getElementById(inputId);
  inp.type = inp.type === 'password' ? 'text' : 'password';
  btn.textContent = inp.type === 'password' ? '👁' : '🙈';
}

// ─── Select Role (Register) ────────────────────────────────
let selectedRole = 'cashier';
function selectRole(role, el) {
  selectedRole = role;
  document.querySelectorAll('.role-opt').forEach(x => x.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('shop-pass-wrap').style.display = role === 'admin' ? 'block' : 'none';
}

// ─── Quick Login ───────────────────────────────────────────
function quickLogin(username, password) {
  document.getElementById('l-user').value = username;
  document.getElementById('l-pass').value = password;
  doLogin();
}

// ─── Login ─────────────────────────────────────────────────
async function doLogin() {
  const username = document.getElementById('l-user').value.trim();
  const password = document.getElementById('l-pass').value;
  const errEl    = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');
  errEl.style.display = 'none';

  if (!username || !password) {
    errEl.textContent = 'Username and password are required';
    errEl.style.display = 'block';
    return;
  }

  btn.textContent = 'Signing in...';
  btn.disabled = true;

  try {
    const data = await API.auth.login({ username, password });
    localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
    localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
    Auth.currentUser = data.user;
    document.getElementById('auth-screen').style.display = 'none';
    App.startApp();
  } catch (err) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      errEl.textContent = 'Please verify your email before logging in.';
      errEl.style.display = 'block';
      // Show inline resend link inside error box
      setTimeout(() => showResendBanner(err.message, errEl), 500);
      return;
    }
    errEl.textContent = err.message || 'Login failed. Check credentials.';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Sign In →';
    btn.disabled = false;
  }
}

// ─── Show resend verification banner ────────────────────────
function showResendBanner(errMsg, parentEl) {
  // Don't duplicate
  if (parentEl.querySelector('.resend-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'resend-banner';
  banner.innerHTML = `
    <span>Didn't receive the verification email?</span>
    <button id="resend-btn-inline">Resend</button>
  `;
  parentEl.parentElement.insertBefore(banner, parentEl.nextSibling);

  document.getElementById('resend-btn-inline').addEventListener('click', async () => {
    try {
      document.getElementById('resend-btn-inline').textContent = 'Sending...';
      document.getElementById('resend-btn-inline').disabled = true;
      let msgEl = document.querySelector('.resend-msg');
      if (!msgEl) {
        msgEl = document.createElement('p');
        msgEl.className = 'resend-msg';
        banner.appendChild(msgEl);
      }
      // We don't have the email from login — back-end checks token anyway
      await API.auth.resendVerification({});
      msgEl.textContent = 'If an unverified account uses this device, a new verification email has been sent.';
      msgEl.className = 'resend-msg success';
      banner.querySelector('#resend-btn-inline').textContent = 'Sent ✓';
    } catch (err2) {
      let msgEl = document.querySelector('.resend-msg');
      if (msgEl) {
        msgEl.textContent = 'Error: ' + (err2.message || 'Request failed');
        msgEl.className   = 'resend-msg error';
      } else {
        toast('Error: ' + (err2.message || 'Request failed'), 'error');
      }
      banner.querySelector('#resend-btn-inline').textContent = 'Resend';
      banner.querySelector('#resend-btn-inline').disabled = false;
    }
  });
}

// ─── Register ──────────────────────────────────────────────
async function doRegister() {
  const name       = document.getElementById('r-name').value.trim();
  const username   = document.getElementById('r-user').value.trim();
  const email      = document.getElementById('r-email').value.trim();
  const password   = document.getElementById('r-pass').value;
  const password2  = document.getElementById('r-pass2').value;
  const shopPassword = document.getElementById('r-shop-pass').value;
  const errEl      = document.getElementById('reg-error');
  const sucEl      = document.getElementById('reg-success');
  const btn        = document.getElementById('reg-btn');

  errEl.style.display = 'none';
  sucEl.style.display = 'none';

  if (!name || !username || !password) {
    errEl.textContent = 'Name, username and password are required';
    errEl.style.display = 'block'; return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Password must be at least 6 characters';
    errEl.style.display = 'block'; return;
  }
  if (password !== password2) {
    errEl.textContent = 'Passwords do not match';
    errEl.style.display = 'block'; return;
  }

  btn.textContent = 'Creating account...';
  btn.disabled = true;

  try {
    const data = await API.auth.register({ name, username, email, password, role: selectedRole, shopPassword });
    sucEl.textContent = '✅ Account created! Redirecting...';
    sucEl.style.display = 'block';
    if (data.token && data.user?.isVerified) {
      localStorage.setItem(CONFIG.TOKEN_KEY, data.token);
      localStorage.setItem(CONFIG.USER_KEY, JSON.stringify(data.user));
      Auth.currentUser = data.user;
      document.getElementById('auth-screen').style.display = 'none';
      App.startApp();
      return;
    }
    if (data.verificationUrl) {
      window.location.href = data.verificationUrl;
      return;
    }
    // Navigate to verification pending page
    window.location.hash = '#verify-email';
    window.location.reload();
  } catch (err) {
    errEl.textContent = err.message || 'Registration failed';
    errEl.style.display = 'block';
  } finally {
    btn.textContent = 'Create Account →';
    btn.disabled = false;
  }
}

// ─── Logout ────────────────────────────────────────────────
function doLogout() {
  Auth.logout();
}

// ══════════════════════════════════════════════════════════
//  Email Verification Page Logic
// ══════════════════════════════════════════════════════════
const V_CARD  = document.getElementById('verify-card');
const V_ICON  = document.getElementById('v-icon');
const V_USER  = document.getElementById('v-user');
const V_SPIN  = document.getElementById('v-spinner');
const V_RESEND_WRAP  = document.getElementById('v-resend-wrap');
const V_RESEND_FORM  = document.getElementById('v-resend-form');
const V_RESEND_BTN   = document.getElementById('v-resend-btn');
const V_RESEND_SUBMIT = document.getElementById('v-resend-submit');
const V_RESEND_EMAIL  = document.getElementById('v-resend-email');
const V_RESEND_MSG     = document.getElementById('v-resend-msg');

const CARD_SUCCESS = document.getElementById('card-success');
const CARD_EXPIRED = document.getElementById('card-expired');
const V_ERR_MSG    = document.getElementById('v-err-msg');
const V_ERR_MSG2   = document.getElementById('v-err-msg2');
const V_ERR_FORM  = document.getElementById('v-err-resend-form');
const V_ERR_SUBMIT = document.getElementById('v-err-resend-submit');
const V_ERR_EMAIL  = document.getElementById('v-err-resend-email');
const V_ERR_BTN   = document.getElementById('v-err-resend-btn');

function showVerifyVariant(which) {
  V_CARD.style.display        = 'none';
  CARD_SUCCESS.style.display  = 'none';
  CARD_EXPIRED.style.display  = 'none';
  document.getElementById('verify-screen').style.display = 'flex';
  if (which === 'pending') { V_CARD.style.display = 'block'; }
  if (which === 'success') { CARD_SUCCESS.style.display = 'block'; cleanupSpinner(); }
  if (which === 'expired') { CARD_EXPIRED.style.display = 'block'; }
}
function cleanupSpinner() { V_SPIN.style.display = 'none'; }

// ── Check token & auto-verify ───────────────────────────────
async function handleVerifyToken(token) {
  showVerifyVariant('pending');
  V_USER.textContent = 'Validating your verification link…';
  V_ICON.textContent = '⏳';
  V_SPIN.style.display = 'block';
  V_RESEND_WRAP.style.display = 'none';

  // Toggle resend section
  V_RESEND_BTN.addEventListener('click', () => {
    const visible = V_RESEND_FORM.style.display !== 'none';
    V_RESEND_FORM.style.display = visible ? 'none' : 'block';
    V_RESEND_BTN.textContent  = visible ? 'Show Resend Options' : 'Hide';
  });

  // Pending resend submit
  V_RESEND_SUBMIT.addEventListener('click', doResendVerify);
  V_RESEND_EMAIL.addEventListener('keydown', e => { if (e.key === 'Enter') doResendVerify(); });

  try {
    const res = await API.auth.verifyEmail({ token });
    showVerifyVariant('success');
  } catch (err) {
    if (err.code === 'TOKEN_EXPIRED') {
      V_USER.textContent  = 'This verification link has expired.';
      V_ICON.textContent  = '⏰';
      V_RESEND_WRAP.style.display = 'none';
      V_SPIN.style.display = 'none';
      showVerifyVariant('expired');
    } else {
      V_USER.textContent  = 'This verification link is invalid.';
      V_ICON.textContent  = '❌';
      V_RESEND_WRAP.style.display = 'none';
      V_SPIN.style.display = 'none';
      V_ERR_MSG.textContent = err.message || 'Invalid verification link.';
      showVerifyVariant('expired');
    }
  }
}

// ── Helpers ────────────────────────────────────────────────
function doResendVerify() {
  const email = V_RESEND_EMAIL.value.trim();
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    V_RESEND_MSG.textContent = 'Enter a valid email address.';
    V_RESEND_MSG.className  = 'resend-msg error'; V_RESEND_MSG.style.display = 'block';
    return;
  }
  V_RESEND_SUBMIT.textContent = 'Sending…';
  V_RESEND_SUBMIT.disabled   = true;
  API.auth.resendVerification({ email })
    .then(() => {
      V_RESEND_MSG.textContent = '✅ Email resent! Check your inbox (and spam folder).';
      V_RESEND_MSG.className  = 'resend-msg success';
      V_RESEND_MSG.style.display = 'block';
      V_RESEND_SUBMIT.textContent = 'Sent ✓';
    })
    .catch(err => {
      V_RESEND_MSG.textContent = '❌ ' + (err.message || 'Failed');
      V_RESEND_MSG.className  = 'resend-msg error';
      V_RESEND_MSG.style.display = 'block';
      V_RESEND_SUBMIT.textContent = 'Resend';
      V_RESEND_SUBMIT.disabled   = false;
    });
}

// ── Hover / interactive button helpers ─────────────────────
function initVerifyDoc() {
  // Expired sub-form toggle
  V_ERR_FORM.addEventListener('click', () => {
    const visible = V_ERR_FORM.style.display !== 'none';
    V_ERR_FORM.style.display = visible ? 'none' : 'block';
    V_ERR_BTN.textContent   = visible ? 'Show Resend Options' : 'Hide';
    if (!visible) V_ERR_MSG2.textContent = '';
  });

  // Expired resend submit
  V_ERR_SUBMIT.addEventListener('click', () => {
    const email = V_ERR_EMAIL.value.trim();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      V_ERR_MSG2.textContent = 'Enter a valid email address.';
      V_ERR_MSG2.style.color = 'var(--red)';
      return;
    }
    V_ERR_SUBMIT.textContent = 'Sending…';
    V_ERR_SUBMIT.disabled   = true;
    API.auth.resendVerification({ email })
      .then(() => {
        V_ERR_MSG2.textContent = '✅ Verification email sent! Check your inbox.';
        V_ERR_MSG2.style.color = 'var(--green)';
        V_ERR_SUBMIT.textContent = 'Sent ✓';
        V_ERR_RESEND_WRAP.style.display = 'none';
        V_ERR_FORM.style.display = 'none';
      })
      .catch(err => {
        V_ERR_MSG2.textContent = '❌ ' + (err.message || 'Failed');
        V_ERR_MSG2.style.color = 'var(--red)';
        V_ERR_SUBMIT.textContent = 'Send New Email';
        V_ERR_SUBMIT.disabled   = false;
      });
  });
}
