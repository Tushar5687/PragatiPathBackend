const express = require('express');
const { createIssue, getUserIssues } = require('../controllers/issue.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// All routes in this file are protected (require auth)
router.use(authMiddleware);

// POST /issues - Report a new issue
router.post('/', createIssue);

// GET /issues - Get all issues for the logged-in user
router.get('/', getUserIssues);
// We will add more routes here later (GET /issues/:id, POST /comments, etc.)
// router.get('/:id', getIssueById);
// router.post('/:id/comments', addComment);

module.exports = router;