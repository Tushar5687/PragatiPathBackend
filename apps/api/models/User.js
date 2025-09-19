const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, index: true, sparse: true }, // optional
    mobile: { type: String, required: true, unique: true }, // must be unique
    passwordHash: { type: String }, // optional if OTP login
    roles: { type: [String], default: ["citizen"] }, // default role
    aadhaar_last4: { type: String }, // optional
    digilocker_id: { type: String }, // optional
    profilePhotoUrl: { type: String },
    address: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      pincode: String,
    },
    isActive: { type: Boolean, default: true },
    metadata: { type: Object }, // extra fields if needed
  },
  { timestamps: true } // adds createdAt + updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
