const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require('path');
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Connect to DB
connectDB();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Pragati Path backend is running 🚀" });
});

// Auth routes
const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);

// Issue routes  
const issueRoutes = require('./routes/issue.routes');
app.use('/issues', issueRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});