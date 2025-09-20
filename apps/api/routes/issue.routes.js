const express = require('express');
const { createIssue, getUserIssues, getIssueById } = require('../controllers/issue.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware'); // Import upload middleware

const router = express.Router();

// All routes in this file are protected (require auth)
router.use(authMiddleware);

// POST /issues - Report a new issue WITH file upload
router.post('/', upload.array('media', 5), createIssue); // ← Add upload middleware here

// GET /issues - Get all issues for the logged-in user
router.get('/', getUserIssues);

// GET /issues/:id - Get a specific issue by ID
router.get('/:id', getIssueById);

module.exports = router;