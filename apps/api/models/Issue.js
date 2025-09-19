const mongoose = require('mongoose');

// Define the Location sub-schema
const locationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    default: 'Point',
    required: true
  },
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    index: '2dsphere' // Geospatial index for efficient location queries
  },
  addressString: {
    type: String,
    required: true
  }
});

// Define the Media sub-schema
const mediaSchema = new mongoose.Schema({
  url: { type: String, required: true },
  mimeType: { type: String, required: true }, // e.g., 'image/jpeg', 'video/mp4'
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }
});

// Define the Timeline Event sub-schema
const timelineEventSchema = new mongoose.Schema({
  action: { type: String, required: true }, // e.g., "reported", "assigned", "in_progress", "resolved"
  performedBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // Can be User or Admin ID
  performedByRole: { type: String, required: true }, // "citizen", "admin", "dept_staff"
  comment: { type: String }, // Optional comment for the event
  timestamp: { type: Date, default: Date.now },
  metadata: { type: Object } // For any additional data
});

const issueSchema = new mongoose.Schema(
  {
    issueId: {
      type: String,
      unique: true,
      required: true // We will generate this manually: PP-YYYYMMDD-0001
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },
    description: {
      type: String,
      required: true
    },
    category: {
      type: String,
      required: true,
      index: true // For faster filtering
      // e.g., "Pothole", "Garbage", "Water Supply", "Street Light"
    },
    severity: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium'
    },
    location: {
      type: locationSchema,
      required: true
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedDepartmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department'
      // Will be set by the routing engine or an admin
    },
    assignedToAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin'
      // Will be set by an admin
    },
    status: {
      type: String,
      enum: ['reported', 'assigned', 'in_progress', 'resolved', 'closed', 'rejected'],
      default: 'reported',
      index: true
    },
    media: [mediaSchema], // Array of media objects
    timeline: [timelineEventSchema], // Array of timeline events
    priority: {
      type: Number,
      default: 0 // Can be used for manual prioritization
    },
    sla: {
      reportedAt: { type: Date, default: Date.now },
      dueAt: Date, // To be calculated based on department's SLA hours
      resolvedAt: Date
    },
    resolutionProof: [mediaSchema], // For photos after resolution
    aiClosureReportUrl: String, // S3 URL for the generated PDF report
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true } // Adds createdAt and updatedAt automatically
);

// Create the model
module.exports = mongoose.model('Issue', issueSchema);