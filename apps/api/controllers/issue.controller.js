const Issue = require('../models/Issue');
// const { v4: uuidv4 } = require('uuid'); // For generating unique IDs if needed
// We'll need a function to generate the human-readable issueId

// @desc    Create a new issue
// @route   POST /issues
// @access  Private (Citizen)
const createIssue = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      severity,
      longitude,
      latitude,
      addressString
    } = req.body;

    // 1. Validate required fields
    if (!title || !description || !category || !longitude || !latitude || !addressString) {
      return res.status(400).json({ error: 'Please provide all required fields: title, description, category, location coordinates, and address.' });
    }

    // 2. Generate a unique human-readable ID (PP-YYYYMMDD-XXXX)
    // This is a simple implementation. For production, use a more robust sequence.
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
    const countToday = await Issue.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    const sequenceNumber = (countToday + 1).toString().padStart(4, '0');
    const generatedIssueId = `PP-${dateString}-${sequenceNumber}`;

    // 3. Create the issue object
   // 3. Create the issue object
const newIssue = new Issue({
  issueId: generatedIssueId,
  title,
  description,
  category,
  severity,
  location: {
    type: 'Point',
    coordinates: [parseFloat(longitude), parseFloat(latitude)],
    addressString
  },
  reportedBy: req.user._id, // FIXED: Changed from req.user.userId to req.user._id
  status: 'reported',
  // timeline is initialized with the creation event
  timeline: [
    {
      action: 'reported',
      performedBy: req.user._id,
      performedByRole: req.user.roles[0], // Assuming first role
      comment: 'Issue reported by citizen.',
      timestamp: new Date()
    }
  ]
});
    // 4. Save the issue to the database
    const savedIssue = await newIssue.save();

    // 5. Populate the reporter's name for the response
    await savedIssue.populate('reportedBy', 'name mobile');

    // 6. Send success response
    res.status(201).json({
      message: 'Issue reported successfully.',
      issue: savedIssue
    });

  } catch (error) {
    console.error('Create issue error:', error);
    // Handle duplicate key error for issueId (very unlikely with this method)
    if (error.code === 11000) {
      return res.status(409).json({ error: 'A issue with this ID already exists. Please try again.' });
    }
    res.status(500).json({ error: 'Internal server error. Failed to report issue.' });
  }
};

// @desc    Get all issues for the logged-in user
// @route   GET /issues
// @access  Private (Citizen)
const getUserIssues = async (req, res) => {
  try {
    // 1. Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // 2. Build the query: Find non-deleted issues reported by this user
    const query = { reportedBy: req.user._id, isDeleted: false };

    // 3. Optional: Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    // 4. Execute the query with pagination
    const issues = await Issue.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(limit)
      .populate('reportedBy', 'name mobile') // Populate reporter info
      .select('-timeline -media'); // Exclude heavy fields for list view

    // 5. Get total count for pagination info
    const total = await Issue.countDocuments(query);

    // 6. Send response
    res.json({
      issues,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalIssues: total
    });

  } catch (error) {
    console.error('Get user issues error:', error);
    res.status(500).json({ error: 'Internal server error. Failed to fetch issues.' });
  }
};
// @desc    Get a single issue by ID
// @route   GET /issues/:id
// @access  Private (Owner or Admin)
const getIssueById = async (req, res) => {
  try {
    const issue = await Issue.findOne({
      _id: req.params.id,
      isDeleted: false
    })
    .populate('reportedBy', 'name mobile')
    .populate('assignedToAdminId', 'name')
    .populate('assignedDepartmentId', 'name code');

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    // Check if user owns this issue or is an admin
    if (issue.reportedBy._id.toString() !== req.user._id.toString() && !req.user.roles.includes('admin')) {
      return res.status(403).json({ error: 'Access denied. You can only view your own issues.' });
    }

    res.json({ issue });

  } catch (error) {
    console.error('Get issue by ID error:', error);
    res.status(500).json({ error: 'Internal server error. Failed to fetch issue.' });
  }
};
module.exports = {
  createIssue,
  getUserIssues
};