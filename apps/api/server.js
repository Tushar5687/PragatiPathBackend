const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Pragati Path backend is running 🚀" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
const connectDB = require("./config/db");

// connect to DB
connectDB();

const authRoutes = require('./routes/auth.routes');
app.use('/auth', authRoutes);
// ... other imports ...
const issueRoutes = require('./routes/issue.routes');

// ... after other middleware ...

// Use Issue Routes
app.use('/issues', issueRoutes); // This prefixes all issue routes with /issues