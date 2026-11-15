const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Creates and saves notifications for target user or role groups.
 */
const sendNotification = async ({
  recipientId,
  recipientRole,
  issueId,
  complaintId,
  title,
  message,
  type,
}) => {
  try {
    // If a specific recipient is provided, notify them directly
    if (recipientId) {
      await Notification.create({
        recipient: recipientId,
        recipientRole: recipientRole || "citizen",
        issue: issueId,
        complaintId: complaintId || "",
        title,
        message,
        type: type || "general",
      });
      return;
    }

    // If notifying a role group (e.g. all admins, or ward officers of a ward, or dept officers)
    if (recipientRole) {
      const query = { role: recipientRole };
      const users = await User.find(query).select("_id role");
      if (users.length > 0) {
        const docs = users.map((u) => ({
          recipient: u._id,
          recipientRole: u.role,
          issue: issueId,
          complaintId: complaintId || "",
          title,
          message,
          type: type || "general",
        }));
        await Notification.insertMany(docs);
      }
    }
  } catch (err) {
    console.error("Failed to create notification:", err.message);
  }
};

/**
 * Notify officers in a specific ward
 */
const notifyWardOfficers = async ({ wardId, issueId, complaintId, title, message, type }) => {
  try {
    const officers = await User.find({
      role: { $in: ["ward_officer", "officer"] },
      wardId: wardId || "WARD-04",
    }).select("_id role");

    if (officers.length > 0) {
      const docs = officers.map((o) => ({
        recipient: o._id,
        recipientRole: "ward_officer",
        issue: issueId,
        complaintId: complaintId || "",
        title,
        message,
        type: type || "complaint_submitted",
      }));
      await Notification.insertMany(docs);
    }
  } catch (err) {
    console.error("Ward notification error:", err.message);
  }
};

/**
 * Notify officers in a specific department
 */
const notifyDepartmentOfficers = async ({ departmentName, issueId, complaintId, title, message, type }) => {
  try {
    const deptKeyword = (departmentName || "").toLowerCase().replace(/department|wing|board|cell/g, "").trim();
    const query = {
      role: { $in: ["department_officer", "district_officer", "department"] },
    };
    if (deptKeyword) {
      query.departmentName = { $regex: new RegExp(deptKeyword, "i") };
    }

    let officers = await User.find(query).select("_id role");
    if (officers.length === 0) {
      officers = await User.find({
        role: { $in: ["department_officer", "district_officer", "department"] },
      }).select("_id role");
    }

    if (officers.length > 0) {
      const docs = officers.map((o) => ({
        recipient: o._id,
        recipientRole: "department_officer",
        issue: issueId,
        complaintId: complaintId || "",
        title,
        message,
        type: type || "forwarded_to_dept",
      }));
      await Notification.insertMany(docs);
    }
  } catch (err) {
    console.error("Department notification error:", err.message);
  }
};

/**
 * Notify all system admins
 */
const notifyAdmins = async ({ issueId, complaintId, title, message, type }) => {
  try {
    const admins = await User.find({ role: "admin" }).select("_id role");
    if (admins.length > 0) {
      const docs = admins.map((a) => ({
        recipient: a._id,
        recipientRole: "admin",
        issue: issueId,
        complaintId: complaintId || "",
        title,
        message,
        type: type || "general",
      }));
      await Notification.insertMany(docs);
    }
  } catch (err) {
    console.error("Admin notification error:", err.message);
  }
};

module.exports = {
  sendNotification,
  notifyWardOfficers,
  notifyDepartmentOfficers,
  notifyAdmins,
};
