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
const { generateOTP, storeOTP, verifyOTP } = require('../utils/otpUtils');

// @desc    Send OTP for login
// @route   POST /auth/otp/send
// @access  Public
const sendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    // Validate mobile number
    if (!mobile) {
      return res.status(400).json({ error: 'Mobile number is required.' });
    }

    // Clean mobile number (remove spaces, +91, etc.)
    const cleanMobile = mobile.replace(/\D/g, '');
    
    if (cleanMobile.length < 10) {
      return res.status(400).json({ error: 'Invalid mobile number.' });
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(cleanMobile, otp);

    // console.log the OTP for development
    console.log(`📱 OTP for ${cleanMobile}: ${otp}`);
    console.log(`⏰ OTP valid for 10 minutes`);

    res.json({ 
      success: true,
      message: 'OTP sent successfully.',
      mobile: cleanMobile
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP. Please try again.' });
  }
};

// @desc    Verify OTP and login
// @route   POST /auth/otp/verify
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    let { mobile, otp } = req.body;

    // Validate input
    if (!mobile || !otp) {
      return res.status(400).json({ error: 'Mobile number and OTP are required.' });
    }

    // Clean mobile number
    mobile = mobile.replace(/\D/g, '');
    
    if (mobile.length < 10) {
      return res.status(400).json({ error: 'Invalid mobile number.' });
    }

    // Verify OTP
    const verification = verifyOTP(mobile, otp);
    
    if (!verification.isValid) {
      return res.status(400).json({ error: verification.message });
    }

    // Find or create user
    let user = await User.findOne({ mobile });

    if (!user) {
      // Create new user with mobile only
      user = await User.create({
        mobile,
        name: `User-${mobile.substring(mobile.length - 4)}`,
        roles: ['citizen']
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is suspended. Please contact support.' });
    }

    // Generate JWT token (same as password login)
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        roles: user.roles
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ error: 'Failed to verify OTP. Please try again.' });
  }
};
module.exports = authMiddleware;