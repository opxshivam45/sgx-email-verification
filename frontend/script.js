// --- Success overlay ---
function showSuccessOverlay() {
  const overlay = document.getElementById('successOverlay');
  overlay.classList.add('show');
}

document.getElementById('closeOverlayBtn').addEventListener('click', () => {
  document.getElementById('successOverlay').classList.remove('show');
});

// --- Dark / light mode toggle ---
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('sgx-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('sgx-theme', next);
  themeToggle.textContent = next === 'dark' ? '☀️' : '🌙';
});

const emailInput = document.getElementById('email');
const emailStatus = document.getElementById('emailStatus');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const otpField = document.getElementById('otpField');
const otpInput = document.getElementById('otp');
const verifyOtpBtn = document.getElementById('verifyOtpBtn');

const form = document.getElementById('consultForm');
const formStatus = document.getElementById('formStatus');
const submitBtn = document.getElementById('submitBtn');

let emailVerified = false;
let resendCooldown = 0;
let cooldownTimer = null;

function startCooldown(seconds) {
  resendCooldown = seconds;
  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = `Resend in ${resendCooldown}s`;

  cooldownTimer = setInterval(() => {
    resendCooldown -= 1;
    if (resendCooldown <= 0) {
      clearInterval(cooldownTimer);
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = 'Resend OTP';
    } else {
      sendOtpBtn.textContent = `Resend in ${resendCooldown}s`;
    }
  }, 1000);
}

function setEmailStatus(type, text) {
  emailInput.classList.remove('taken', 'available', 'checking');
  emailStatus.className = 'email-status';
  if (type) {
    emailInput.classList.add(type);
    emailStatus.classList.add(type);
  }
  emailStatus.textContent = text;
}

// Reset verification state whenever the email is edited
emailInput.addEventListener('input', () => {
  emailVerified = false;
  setEmailStatus('', '');
  otpField.style.display = 'none';
  otpInput.value = '';
  clearInterval(cooldownTimer);
  sendOtpBtn.disabled = false;
  sendOtpBtn.textContent = 'Send OTP';
});

// Step 1: Send OTP to the entered email
sendOtpBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();

  if (!email || !email.includes('@')) {
    setEmailStatus('taken', 'Please enter a valid email address first.');
    return;
  }

  sendOtpBtn.disabled = true;
  sendOtpBtn.textContent = 'Sending...';
  setEmailStatus('checking', 'Sending OTP to your email...');

  try {
    const res = await fetch('/api/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();

    if (data.success) {
      if (data.skipOtp) {
        // Already-registered email - auto verify, no OTP needed
        setEmailStatus('available', data.message || 'Welcome back! Your email is already verified.');
        emailVerified = true;
        otpField.style.display = 'none';
        sendOtpBtn.disabled = false;
        sendOtpBtn.textContent = 'Send OTP';
        return;
      }
      setEmailStatus('checking', 'OTP sent. Please check your inbox.');
      otpField.style.display = 'block';
      otpInput.focus();
      startCooldown(30);
    } else {
      setEmailStatus('taken', data.error || 'Failed to send OTP. Please try again.');
      sendOtpBtn.disabled = false;
      sendOtpBtn.textContent = 'Send OTP';
    }
  } catch (err) {
    setEmailStatus('taken', 'Network error. Please try again.');
    sendOtpBtn.disabled = false;
    sendOtpBtn.textContent = 'Send OTP';
  }
});

// Step 2: Verify the entered OTP
verifyOtpBtn.addEventListener('click', async () => {
  const email = emailInput.value.trim();
  const otp = otpInput.value.trim();

  if (!otp || otp.length !== 6) {
    setEmailStatus('taken', 'Please enter the 6-digit OTP sent to your email.');
    return;
  }

  verifyOtpBtn.disabled = true;
  verifyOtpBtn.textContent = 'Verifying...';

  try {
    const res = await fetch('/api/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp })
    });
    const data = await res.json();

    if (data.success) {
      setEmailStatus('available', 'Email verified successfully.');
      emailVerified = true;
      otpField.style.display = 'none';
    } else {
      setEmailStatus('taken', data.error || 'Invalid or expired OTP.');
      emailVerified = false;
    }
  } catch (err) {
    setEmailStatus('taken', 'Network error. Please try again.');
  } finally {
    verifyOtpBtn.disabled = false;
    verifyOtpBtn.textContent = 'Verify';
  }
});

// Step 3: Final form submission - only allowed after email is verified
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formStatus.className = 'form-status';
  formStatus.textContent = '';

  if (!emailVerified) {
    formStatus.className = 'form-status error';
    formStatus.textContent = 'Please verify your email with the OTP before submitting.';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const data = Object.fromEntries(new FormData(form).entries());

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      form.reset();
      emailVerified = false;
      setEmailStatus('', '');
      otpField.style.display = 'none';
      showSuccessOverlay();
    } else {
      formStatus.className = 'form-status error';
      formStatus.textContent = result.error || 'Something went wrong.';
    }
  } catch (err) {
    formStatus.className = 'form-status error';
    formStatus.textContent = 'Network error. Please try again.';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Request';
  }
});