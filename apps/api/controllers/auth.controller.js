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
module.exports = {
  registerUser,
  loginUser,
  getMe
};