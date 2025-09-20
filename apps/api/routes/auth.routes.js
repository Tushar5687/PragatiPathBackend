const express = require('express');
const { registerUser, loginUser, getMe, sendOtp, verifyOtp } = require('../controllers/auth.controller');

const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);        // ← Password login (kept intact)
router.post('/otp/send', sendOtp);       // ← New OTP send route
router.post('/otp/verify', verifyOtp);   // ← New OTP verify route

// Protected routes
router.get('/me', authMiddleware, getMe);

module.exports = router;