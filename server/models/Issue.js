const mongoose = require("mongoose");

const VALID_STATUSES = [
  "Submitted",
  "Under Ward Verification",
  "Verified",
  "Rejected",
  "More Information Required",
  "Forwarded to Department",
  "Work Assigned",
  "Work In Progress",
  "Work Completed",
  "Awaiting Admin Verification",
  "Resolved",
  "Reopened",
  // Legacy aliases
  "Reported",
  "UNSOLVED",
  "Under Review",
  "UNDER REVIEW",
  "In Progress",
  "IN PROGRESS",
  "Assigned",
  "ASSIGNED",
  "Pending Verification",
  "PENDING VERIFICATION",
  "Completed",
  "COMPLETED",
  "SOLVED",
  "REJECTED",
];

const issueSchema = new mongoose.Schema(
  {
    complaintId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters long"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Waste Management",
        "Garbage & Waste",
        "Sanitation",
        "Roads",
        "Road Damage",
        "Water Supply",
        "Water Leakage",
        "Electricity",
        "Street Lights",
        "Streetlight",
        "Drainage",
        "Public Safety",
        "Infrastructure",
        "Parks",
        "Other",
        "Other Issue",
      ],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      minlength: [3, "Description must be at least 3 characters long"],
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    latitude: {
      type: Number,
      default: 17.6868,
    },
    longitude: {
      type: Number,
      default: 83.2185,
    },
    locationCoords: {
      lat: { type: Number, default: 17.6868 },
      lng: { type: Number, default: 83.2185 },
    },
    image: {
      type: String,
      default: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
    },
    video: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: VALID_STATUSES,
      default: "Submitted",
      index: true,
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical", "low", "medium", "high", "critical"],
      default: "High",
    },
    wardId: {
      type: String,
      default: "WARD-04",
      trim: true,
      index: true,
    },
    wardName: {
      type: String,
      default: "Duvvada Ward 4",
      trim: true,
    },
    assignedDept: {
      type: String,
      default: "Roads & Infrastructure Department",
      trim: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reportedDate: {
      type: Date,
      default: Date.now,
    },

    // Ward Officer Verification Details
    verificationDetails: {
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      officerName: { type: String, default: "" },
      verifiedAt: { type: Date },
      status: { type: String, default: "" },
      remarks: { type: String, default: "" },
      rejectionReason: { type: String, default: "" },
      infoRequested: { type: String, default: "" },
      infoProvided: { type: String, default: "" },
      infoProvidedAt: { type: Date },
    },

    // Department Work Assignment Details
    assignmentDetails: {
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      officerName: { type: String, default: "" },
      assignedAt: { type: Date },
      assignedTeam: { type: String, default: "" },
      assignedStaff: { type: String, default: "" },
      staffPhone: { type: String, default: "" },
      priority: { type: String, default: "High" },
      estimatedCompletionDate: { type: Date },
      workInstructions: { type: String, default: "" },
    },

    // Work Progress Tracking
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    progressNotes: {
      type: String,
      default: "",
    },

    // Department Work Completion Details
    completionDetails: {
      completedAt: { type: Date },
      completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      officerName: { type: String, default: "" },
      beforeImage: { type: String, default: "" },
      afterImage: { type: String, default: "" },
      completionRemarks: { type: String, default: "" },
    },

    // Admin Final Verification & Approval
    adminReview: {
      reviewedAt: { type: Date },
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      adminName: { type: String, default: "" },
      approved: { type: Boolean, default: false },
      remarks: { type: String, default: "" },
    },

    // Reopen Audit History
    reopenDetails: {
      reopenedAt: { type: Date },
      reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      reopenedByName: { type: String, default: "" },
      role: { type: String, default: "" },
      reason: { type: String, default: "" },
    },

    // Citizen Feedback (Post-Resolution)
    citizenFeedback: {
      submittedAt: { type: Date },
      rating: { type: Number, min: 1, max: 5 },
      comment: { type: String, default: "" },
    },

    // Legacy fields for backward compatibility
    officerRemarks: { type: String, default: "" },
    actionTaken: { type: String, default: "" },
    expectedResolutionDate: { type: String, default: "" },
    resolutionImage: { type: String, default: "" },
    resolutionNote: { type: String, default: "" },
    updatedByOfficer: { type: String, default: "" },

    // Metrics & Community
    views: {
      type: Number,
      default: 1,
    },
    likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    upvotes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    verifications: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: { type: String, default: "Community Verified" },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Comprehensive Audit Timeline
    timeline: [
      {
        status: { type: String, required: true },
        note: { type: String, required: true },
        updatedBy: { type: String, default: "System" },
        role: { type: String, default: "system" },
        date: { type: Date, default: Date.now },
      },
    ],

    // AI Classification
    aiSeverity: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
    aiPriorityScore: {
      type: Number,
      default: 75,
    },
    aiEstimatedDays: {
      type: Number,
      default: 3,
    },
    aiTags: [{ type: String }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes for lightning-fast filtered role queries
issueSchema.index({ wardId: 1, status: 1 });
issueSchema.index({ assignedDept: 1, status: 1 });
issueSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Issue", issueSchema);
