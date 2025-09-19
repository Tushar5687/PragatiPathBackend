const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE START ===');
    
    // 1. Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    console.log('Authorization header:', req.header('Authorization'));
    console.log('Extracted token:', token);

    // 2. Check if token exists
    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    // 3. Verify the token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token decoded successfully:', decoded);
    } catch (jwtError) {
      console.log('❌ Token verification failed:', jwtError.message);
      return res.status(401).json({ error: 'Invalid token.' });
    }

    // 4. Find the user from the token payload
    console.log('Looking for user with ID:', decoded.userId);
    const user = await User.findById(decoded.userId).select('_id name email mobile roles');
    console.log('User found in database:', user);

    if (!user) {
      console.log('❌ User not found in database');
      return res.status(401).json({ error: 'Token is not valid. User not found.' });
    }

    // 5. Attach the user to the request object
    req.user = user;
    console.log('✅ req.user set to:', req.user);
    console.log('=== AUTH MIDDLEWARE END ===');
    next(); // Proceed to the next middleware or route handler

  } catch (error) {
    console.error('Auth middleware unexpected error:', error);
    res.status(500).json({ error: 'Internal server error in authentication.' });
  }
};

module.exports = authMiddleware;