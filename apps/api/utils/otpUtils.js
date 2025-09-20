const crypto = require('crypto');

// In-memory store for OTPs (Use Redis in production)
const otpStore = new Map();

// Generate random 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Store OTP with expiry (10 minutes)
const storeOTP = (mobile, otp) => {
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  otpStore.set(mobile, { otp, expiresAt });
  return { otp, expiresAt };
};

// Verify OTP
const verifyOTP = (mobile, enteredOTP) => {
  const storedData = otpStore.get(mobile);
  
  if (!storedData) {
    return { isValid: false, message: 'OTP not found. Please request a new one.' };
  }
  
  if (Date.now() > storedData.expiresAt) {
    otpStore.delete(mobile);
    return { isValid: false, message: 'OTP has expired. Please request a new one.' };
  }
  
  if (storedData.otp !== enteredOTP) {
    return { isValid: false, message: 'Invalid OTP.' };
  }
  
  otpStore.delete(mobile);
  return { isValid: true, message: 'OTP verified successfully.' };
};

// Clean expired OTPs every minute
setInterval(() => {
  const now = Date.now();
  for (const [mobile, data] of otpStore.entries()) {
    if (now > data.expiresAt) {
      otpStore.delete(mobile);
    }
  }
}, 60 * 1000);

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP
};