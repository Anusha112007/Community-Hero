const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recipientRole: {
      type: String,
      enum: ["citizen", "ward_officer", "department_officer", "admin"],
      required: true,
    },
    issue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
    },
    complaintId: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: [
        "complaint_submitted",
        "ward_verified",
        "ward_rejected",
        "more_info_required",
        "info_provided",
        "forwarded_to_dept",
        "work_assigned",
        "progress_updated",
        "work_completed",
        "admin_approved",
        "corrections_requested",
        "complaint_resolved",
        "complaint_reopened",
        "citizen_feedback",
        "general",
      ],
      default: "general",
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
