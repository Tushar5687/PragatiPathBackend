const express = require('express');
const { registerUser, loginUser, getMe } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware'); // Import the middleware

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// Add the protected route. The authMiddleware runs first, then getMe.
router.get('/me', authMiddleware, getMe);

module.exports = router;