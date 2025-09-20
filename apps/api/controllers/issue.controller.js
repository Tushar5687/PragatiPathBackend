const Issue = require('../models/Issue');
const mongoose = require('mongoose');
const { processImage, getPublicUrl } = require('../services/imageService');
const fs = require('fs');

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

    // 2. Generate a unique human-readable ID
    const today = new Date();
    const dateString = today.toISOString().slice(0, 10).replace(/-/g, '');
    const countToday = await Issue.countDocuments({
      createdAt: {
        $gte: new Date(today.setHours(0, 0, 0, 0)),
        $lt: new Date(today.setHours(23, 59, 59, 999))
      }
    });
    const sequenceNumber = (countToday + 1).toString().padStart(4, '0');
    const generatedIssueId = `PP-${dateString}-${sequenceNumber}`;

    // 3. Process uploaded files
    const mediaFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          const processedPath = await processImage(file.path, file.filename);
          const publicUrl = getPublicUrl(processedPath);
          
          mediaFiles.push({
            url: publicUrl,
            mimeType: file.mimetype,
            uploadedBy: req.user._id,
            uploadedAt: new Date(),
            originalName: file.originalname
          });
        } catch (processError) {
          console.error('Failed to process file:', file.originalname, processError);
          // Continue with other files even if one fails
        }
      }
    }

    // 4. Create the issue object
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
      reportedBy: req.user._id,
      status: 'reported',
      media: mediaFiles,
      timeline: [
        {
          action: 'reported',
          performedBy: req.user._id,
          performedByRole: req.user.roles[0],
          comment: 'Issue reported by citizen.',
          timestamp: new Date()
        }
      ]
    });

    // 5. Save the issue to the database
    const savedIssue = await newIssue.save();

    // 6. Populate the reporter's name for the response
    await savedIssue.populate('reportedBy', 'name mobile');

    // 7. Send success response
    res.status(201).json({
      message: 'Issue reported successfully.',
      issue: savedIssue
    });

  } catch (error) {
    console.error('Create issue error:', error);
    
    // Safe file cleanup with error handling
    // if (req.files) {
    //   for (const file of req.files) {
    //     try {
    //       if (fs.existsSync(file.path)) {
    //         fs.unlinkSync(file.path);
    //         console.log('Cleaned up file:', file.path);
    //       }
    //     } catch (cleanupError) {
    //       console.warn('Could not delete file:', file.path, cleanupError.message);
    //       // Continue with other files
    //     }
    //   }
    // }

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
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { reportedBy: req.user._id, isDeleted: false };

    if (req.query.status) {
      query.status = req.query.status;
    }

    const issues = await Issue.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('reportedBy', 'name mobile')
      .select('-timeline -media');

    const total = await Issue.countDocuments(query);

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
    const issueId = req.params.id;

    // Validate issue ID format
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ error: 'Invalid issue ID format.' });
    }

    const issue = await Issue.findOne({
      _id: issueId,
      isDeleted: false
    })
    .populate('reportedBy', 'name mobile')
    .populate('assignedToAdminId', 'name')
    .populate('assignedDepartmentId', 'name code');

    if (!issue) {
      return res.status(404).json({ error: 'Issue not found.' });
    }

    // Check if user owns this issue or is an admin
    const isOwner = issue.reportedBy._id.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes('admin') || req.user.roles.includes('dept_staff');
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'Access denied. You can only view your own issues.' });
    }

    res.json({
      success: true,
      issue: issue
    });

  } catch (error) {
    console.error('Get issue by ID error:', error);
    res.status(500).json({ error: 'Internal server error. Failed to fetch issue.' });
  }
};

module.exports = {
  createIssue,
  getUserIssues,
  getIssueById
};