const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, mobile, password } = req.body;

    // 1. Check if user already exists
    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists with this mobile number.' });
    }

    // 2. Hash the password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Create the user
    const user = await User.create({
      name,
      email,
      mobile,
      passwordHash: hashedPassword, // Store the hash, not the plain password
      // roles: ['citizen'] is added by default from the schema
    });

    // 4. Generate a JWT token
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 5. Return success response (omit passwordHash from the response)
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        roles: user.roles
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
};
// @desc    Login user
// @route   POST /auth/login
// @access  Public
// @desc    Login user
// @route   POST /auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // 1. Find the user by mobile number
    const user = await User.findOne({ mobile }).select('+passwordHash'); // Explicitly select the password hash field

    // 2. Check if user exists and is active
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' }); // Use a generic error message for security
    }

    // 3. Check if a password is set for the user (in case they used OTP)
    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Please log in using OTP or set a password.' });
    }

    // 4. Compare the provided password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid mobile number or password.' });
    }

    // 5. Generate a JWT token
    // In loginUser function:
const token = jwt.sign(
  { userId: user._id, roles: user.roles }, // ← Make sure it's userId: user._id
  process.env.JWT_SECRET,
  { expiresIn: '7d' }
);

    // 6. Return the token and user info (omit passwordHash)
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        roles: user.roles
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
};

// @desc    Get current user profile
// @route   GET /auth/me
// @access  Private (requires auth)
const getMe = async (req, res) => {
  // req.user was attached by the authMiddleware
  res.json({
    user: req.user
  });
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
module.exports = {
  registerUser,
  loginUser,
  getMe,
  sendOtp,     // ← Add this
  verifyOtp    // ← Add this
};