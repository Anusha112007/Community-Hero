const express = require("express");
const mongoose = require("mongoose");
const Issue = require("../models/Issue");
const User = require("../models/User");
const {
  protect,
  authorize,
  normalizeRole,
  checkWardAccess,
  checkDepartmentAccess,
} = require("../middleware/authMiddleware");
const {
  sendNotification,
  notifyWardOfficers,
  notifyDepartmentOfficers,
  notifyAdmins,
} = require("../utils/notify");

const router = express.Router();

// Helper to generate unique complaint ID (e.g. CH-2026-10492)
const generateComplaintId = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `CH-${year}-${randomNum}`;
};

// Helper to normalize any incoming category string
const normalizeCategory = (cat) => {
  if (!cat) return "Other";
  const c = cat.trim();
  const map = {
    "Road Damage": "Roads",
    "Roads": "Roads",
    "Water Leakage": "Water Supply",
    "Water Supply": "Water Supply",
    "Garbage & Waste": "Waste Management",
    "Waste Management": "Waste Management",
    "Sanitation": "Waste Management",
    "Streetlight": "Street Lights",
    "Street Lights": "Street Lights",
    "Drainage": "Drainage",
    "Infrastructure": "Public Safety",
    "Public Safety": "Public Safety",
    "Electricity": "Electricity",
    "Parks": "Parks",
    "Other Issue": "Other",
    "Other": "Other",
  };
  return map[c] || c;
};

// Helper to find issue by either ObjectId or complaintId
const findIssueByIdOrComplaintId = async (idParam) => {
  if (!idParam) return null;
  const cleanId = String(idParam).trim().replace(/^#+/, "");

  if (mongoose.Types.ObjectId.isValid(cleanId)) {
    const byMongoId = await Issue.findById(cleanId)
      .populate("user", "name email points level title wardId wardName municipality phone")
      .populate("verificationDetails.verifiedBy", "name role")
      .populate("assignmentDetails.assignedBy", "name role")
      .populate("completionDetails.completedBy", "name role")
      .populate("adminReview.reviewedBy", "name role");
    if (byMongoId) return byMongoId;
  }

  // Look up by complaintId (case-insensitive)
  return await Issue.findOne({
    $or: [
      { complaintId: cleanId },
      { complaintId: cleanId.toUpperCase() },
      { complaintId: new RegExp(`^${cleanId}$`, "i") },
    ],
  })
    .populate("user", "name email points level title wardId wardName municipality phone")
    .populate("verificationDetails.verifiedBy", "name role")
    .populate("assignmentDetails.assignedBy", "name role")
    .populate("completionDetails.completedBy", "name role")
    .populate("adminReview.reviewedBy", "name role");
};

// @desc    AI Intelligent Analysis endpoint
// @route   POST /api/issues/ai-analyze
// @access  Public
const { GoogleGenAI } = require("@google/genai");

router.post("/ai-analyze", async (req, res) => {
  try {
    const { title = "", description = "", image = "" } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      const text = `${title} ${description}`.toLowerCase();
      let category = "Other";
      let aiSeverity = "Medium";
      let aiPriorityScore = 65;
      let aiEstimatedDays = 3;
      let aiTags = ["#CommunityReport"];

      if (text.includes("pothole") || text.includes("road") || text.includes("crack") || text.includes("asphalt")) {
        category = "Roads";
        aiSeverity = text.includes("deep") || text.includes("severe") || text.includes("accident") ? "Critical" : "High";
        aiPriorityScore = aiSeverity === "Critical" ? 94 : 82;
        aiEstimatedDays = 2;
        aiTags = ["#RoadHazard", "#TrafficSafety", "#PotholeAlert"];
      } else if (text.includes("garbage") || text.includes("waste") || text.includes("trash") || text.includes("dump")) {
        category = "Waste Management";
        aiSeverity = text.includes("toxic") || text.includes("school") || text.includes("odor") ? "High" : "Medium";
        aiPriorityScore = 80;
        aiEstimatedDays = 1;
        aiTags = ["#CleanNeighborhood", "#Sanitation", "#WasteRemoval"];
      } else if (text.includes("water") || text.includes("leak") || text.includes("pipe") || text.includes("burst")) {
        category = "Water Supply";
        aiSeverity = text.includes("burst") || text.includes("drinking") ? "Critical" : "High";
        aiPriorityScore = 90;
        aiEstimatedDays = 1;
        aiTags = ["#WaterConservation", "#PipeBurst", "#CivicResource"];
      } else if (text.includes("light") || text.includes("street") || text.includes("lamp") || text.includes("dark")) {
        category = "Street Lights";
        aiSeverity = "Medium";
        aiPriorityScore = 72;
        aiEstimatedDays = 2;
        aiTags = ["#StreetLighting", "#PublicSafety", "#CivicNight"];
      } else if (text.includes("drain") || text.includes("sewage") || text.includes("gutter") || text.includes("overflow")) {
        category = "Drainage";
        aiSeverity = "High";
        aiPriorityScore = 85;
        aiEstimatedDays = 2;
        aiTags = ["#DrainageIssue", "#SanitationHazard", "#CivicRepair"];
      } else if (text.includes("fire") || text.includes("danger") || text.includes("hazard") || text.includes("wire")) {
        category = "Public Safety";
        aiSeverity = "Critical";
        aiPriorityScore = 95;
        aiEstimatedDays = 1;
        aiTags = ["#PublicSafety", "#UrgentAction", "#SafetyAlert"];
      } else if (text.includes("park") || text.includes("tree") || text.includes("garden")) {
        category = "Parks";
        aiSeverity = "Low";
        aiPriorityScore = 55;
        aiEstimatedDays = 4;
        aiTags = ["#ParkMaintenance", "#GreenSpaces", "#UrbanCivic"];
      } else if (text.includes("electric") || text.includes("power") || text.includes("transformer")) {
        category = "Electricity";
        aiSeverity = "High";
        aiPriorityScore = 88;
        aiEstimatedDays = 1;
        aiTags = ["#PowerGrid", "#ElectricalSafety", "#CivicUtility"];
      }

      return res.json({
        category,
        aiSeverity,
        aiPriorityScore,
        aiEstimatedDays,
        aiTags,
        suggestedDept: `${category} Department`,
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const parts = [
      {
        text: `Analyze this civic issue report.
Title: ${title}
Description: ${description}

Classify the issue strictly into one of these categories: "Waste Management", "Roads", "Water Supply", "Electricity", "Street Lights", "Drainage", "Public Safety", "Parks", "Other".
Determine Severity ("Low", "Medium", "High", "Critical").
Estimate Priority Score (0 to 100).
Estimate Fix Days (integer).
Provide 3 relevant hashtag tags.

Return ONLY a valid JSON object matching this exact structure:
{
  "category": "String",
  "aiSeverity": "String",
  "aiPriorityScore": Number,
  "aiEstimatedDays": Number,
  "aiTags": ["String", "String", "String"]
}`,
      },
    ];

    if (image && image.startsWith("data:image/")) {
      const mimeTypeMatch = image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
      const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
      const base64Data = image.split(",")[1];
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: parts,
    });

    const responseText = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(responseText);

    res.json({
      ...parsed,
      suggestedDept: `${parsed.category} Department`,
    });
  } catch (error) {
    console.error("AI analysis fallback:", error.message);
    res.json({
      category: "Roads",
      aiSeverity: "High",
      aiPriorityScore: 80,
      aiEstimatedDays: 2,
      aiTags: ["#CivicReport", "#CommunityHero"],
      suggestedDept: "Roads & Infrastructure Department",
    });
  }
});

// @desc    Predictive Insights endpoint
// @route   GET /api/issues/insights
// @access  Public
router.get("/insights", async (req, res) => {
  try {
    const insights = {
      hotspots: [
        { zone: "Gajuwaka Main Road Corridor", riskLevel: "Critical Risk (92%)", primaryIssue: "Waste Dumping & Drain Blockage", recommendedAction: "Deploy daily compaction trucks & clear storm drains" },
        { zone: "MVP Colony Intersection", riskLevel: "High Risk (84%)", primaryIssue: "Road Potholes & Rain Erosion", recommendedAction: "Apply quick-curing cold asphalt patch" },
        { zone: "NAD Junction Commercial Area", riskLevel: "High Risk (79%)", primaryIssue: "Stormwater Drain Overflow", recommendedAction: "Clear underground silt traps before monsoon peak" },
        { zone: "Steel Plant Outer Belt", riskLevel: "Moderate Risk (65%)", primaryIssue: "Unlit Streetlights", recommendedAction: "Upgrade high-mast bulbs to smart LED grid" },
      ],
      seasonalForecast: [
        { season: "Monsoon Period (July - Sept)", forecast: "High risk of drainage overflow (+40%) & street pothole widening (+65%)" },
        { season: "Summer Season (March - June)", forecast: "Peak underground pipeline pressure leading to pipe bursts (+30%)" },
      ],
      civicEfficiencyScore: 89,
      totalWaterSavedLiters: 18500,
      totalPotholesSealed: 34,
      totalLightsRestored: 52,
    };
    res.json(insights);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching insights", error: error.message });
  }
});

// @desc    Get dashboard metrics & stats
// @route   GET /api/issues/stats
// @access  Public
router.get("/stats", async (req, res) => {
  try {
    const total = await Issue.countDocuments();
    const reported = await Issue.countDocuments({ status: { $in: ["Submitted", "Reported", "UNSOLVED"] } });
    const inProgress = await Issue.countDocuments({ status: { $in: ["Work In Progress", "In Progress", "IN PROGRESS", "Work Assigned"] } });
    const resolved = await Issue.countDocuments({ status: { $in: ["Resolved", "SOLVED"] } });

    const categories = [
      "Waste Management",
      "Roads",
      "Water Supply",
      "Electricity",
      "Street Lights",
      "Drainage",
      "Public Safety",
      "Parks",
      "Other",
    ];

    const categoryCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await Issue.countDocuments({ category: cat });
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return { category: cat, count, percentage };
      })
    );

    const recentReports = await Issue.find()
      .populate("user", "name level points")
      .sort({ createdAt: -1 })
      .limit(6);

    res.json({
      total,
      reported,
      inProgress,
      resolved,
      pending: total - resolved,
      categoryCounts,
      recentReports,
    });
  } catch (error) {
    console.error("Get Stats Error:", error);
    res.status(500).json({ message: "Server error fetching stats", error: error.message });
  }
});

// @desc    Get my reported issues (Citizen)
// @route   GET /api/issues/my-reports
// @access  Private (Citizen)
router.get("/my-reports", protect, async (req, res) => {
  try {
    const issues = await Issue.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "name email points level title");
    res.json(issues);
  } catch (error) {
    console.error("Get My Reports Error:", error);
    res.status(500).json({ message: "Server error fetching your reports", error: error.message });
  }
});

// ==========================================
// WARD OFFICER WORKFLOW ENDPOINTS
// ==========================================

// @desc    Get all complaints belonging to a specific ward
// @route   GET /api/issues/ward/:wardId
// @access  Private (Ward Officer assigned to ward, or Admin)
router.get("/ward/:wardId", protect, authorize("ward_officer", "admin"), async (req, res) => {
  try {
    const { wardId } = req.params;
    const { status, search } = req.query;

    // Strict Ward Isolation check
    if (!checkWardAccess(req.user, wardId)) {
      return res.status(403).json({
        message: `Access denied. You are assigned to '${req.user.wardId}' and cannot access complaints for '${wardId}'.`,
      });
    }

    const query = { wardId: { $regex: new RegExp(`^${wardId}$`, "i") } };

    if (status && status !== "All") {
      if (status === "pending") {
        query.status = {
          $in: ["Submitted", "Reported", "UNSOLVED", "Under Ward Verification", "Under Review", "More Information Required"],
        };
      } else if (status === "verified") {
        query.status = {
          $in: ["Verified", "Forwarded to Department", "Work Assigned", "Work In Progress"],
        };
      } else if (status === "rejected") {
        query.status = { $in: ["Rejected", "REJECTED"] };
      } else {
        query.status = status;
      }
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ title: regex }, { description: regex }, { complaintId: regex }, { location: regex }];
    }

    const issues = await Issue.find(query)
      .populate("user", "name email phone points level")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("Ward complaints error:", error);
    res.status(500).json({ message: "Server error fetching ward complaints", error: error.message });
  }
});

// @desc    Ward Officer verifies, rejects, or requests info on a complaint
// @route   PUT /api/issues/:id/ward-verify
// @access  Private (Ward Officer assigned to ward, or Admin)
router.put("/:id/ward-verify", protect, authorize("ward_officer", "admin"), async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Strict Ward Access validation
    if (!checkWardAccess(req.user, issue.wardId)) {
      return res.status(403).json({
        message: `Access denied. Complaint belongs to '${issue.wardId}', but your assigned ward is '${req.user.wardId}'.`,
      });
    }

    // Citizen complaints can only be verified when in pending state
    const pendingStatuses = [
      "Submitted",
      "Reported",
      "UNSOLVED",
      "Under Ward Verification",
      "Under Review",
      "More Information Required",
      "Reopened",
    ];
    if (!pendingStatuses.includes(issue.status)) {
      return res.status(400).json({
        message: `Cannot verify complaint in '${issue.status}' status. It must be in a pending verification state.`,
      });
    }

    const { action, remarks, rejectionReason, infoRequested, assignedDepartment, priority } = req.body;
    const officerName = req.user.name || "Ward Officer";

    if (action === "approve" || action === "verify") {
      // Approve valid complaint and forward to department
      const targetDept = assignedDepartment || issue.assignedDept || "Roads & Infrastructure Department";
      issue.status = "Forwarded to Department";
      issue.assignedDept = targetDept;
      if (priority) issue.priority = priority;

      issue.verificationDetails = {
        verifiedBy: req.user._id,
        officerName,
        verifiedAt: new Date(),
        status: "Verified",
        remarks: remarks || "Complaint verified on-site by Ward Officer and forwarded to department.",
      };

      issue.timeline.push({
        status: "Forwarded to Department",
        note: remarks || `Verified by Ward Officer ${officerName} and forwarded to ${targetDept}.`,
        updatedBy: officerName,
        role: "ward_officer",
        date: new Date(),
      });

      await issue.save();

      // Notifications
      await sendNotification({
        recipientId: issue.user._id || issue.user,
        recipientRole: "citizen",
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "Complaint Verified by Ward Officer",
        message: `Your complaint (${issue.complaintId}) has been verified and forwarded to ${targetDept}.`,
        type: "forwarded_to_dept",
      });

      await notifyDepartmentOfficers({
        departmentName: targetDept,
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "New Verified Complaint Forwarded",
        message: `A new complaint (${issue.complaintId}) in ${issue.wardName || issue.wardId} has been forwarded for work assignment.`,
        type: "forwarded_to_dept",
      });
    } else if (action === "reject") {
      // Reject with mandatory reason
      if (!rejectionReason || rejectionReason.trim().length < 5) {
        return res.status(400).json({
          message: "A mandatory rejection reason (at least 5 characters) must be provided.",
        });
      }

      issue.status = "Rejected";
      issue.verificationDetails = {
        verifiedBy: req.user._id,
        officerName,
        verifiedAt: new Date(),
        status: "Rejected",
        rejectionReason: rejectionReason.trim(),
        remarks: remarks || rejectionReason.trim(),
      };

      issue.timeline.push({
        status: "Rejected",
        note: `Rejected by Ward Officer ${officerName}. Reason: ${rejectionReason.trim()}`,
        updatedBy: officerName,
        role: "ward_officer",
        date: new Date(),
      });

      await issue.save();

      // Notify citizen with reason
      await sendNotification({
        recipientId: issue.user._id || issue.user,
        recipientRole: "citizen",
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "Complaint Rejected",
        message: `Your complaint (${issue.complaintId}) was rejected by Ward Officer. Reason: ${rejectionReason.trim()}`,
        type: "ward_rejected",
      });
    } else if (action === "request_info") {
      if (!infoRequested || infoRequested.trim().length < 5) {
        return res.status(400).json({
          message: "Please specify the additional information required from the citizen.",
        });
      }

      issue.status = "More Information Required";
      issue.verificationDetails = {
        verifiedBy: req.user._id,
        officerName,
        verifiedAt: new Date(),
        status: "More Information Required",
        infoRequested: infoRequested.trim(),
        remarks: remarks || infoRequested.trim(),
      };

      issue.timeline.push({
        status: "More Information Required",
        note: `More info requested by Ward Officer ${officerName}: "${infoRequested.trim()}"`,
        updatedBy: officerName,
        role: "ward_officer",
        date: new Date(),
      });

      await issue.save();

      // Notify citizen
      await sendNotification({
        recipientId: issue.user._id || issue.user,
        recipientRole: "citizen",
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "More Information Needed",
        message: `Ward Officer requested details on ${issue.complaintId}: "${infoRequested.trim()}". Please update your report.`,
        type: "more_info_required",
      });
    } else {
      return res.status(400).json({
        message: "Invalid action. Must be 'approve', 'reject', or 'request_info'.",
      });
    }

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Ward verification error:", error);
    res.status(500).json({ message: "Server error during ward verification", error: error.message });
  }
});

// ==========================================
// DEPARTMENT OFFICER WORKFLOW ENDPOINTS
// ==========================================

// @desc    Get verified complaints assigned to the officer's department
// @route   GET /api/issues/department/:deptName
// @access  Private (Department Officer of that department, or Admin)
router.get("/department/:deptName", protect, authorize("department_officer", "admin"), async (req, res) => {
  try {
    const { deptName } = req.params;
    const { status, category, ward, priority, search } = req.query;

    // Strict Department Access verification
    if (!checkDepartmentAccess(req.user, deptName)) {
      return res.status(403).json({
        message: `Access denied. You are assigned to '${req.user.departmentName}' and cannot access complaints for '${deptName}'.`,
      });
    }

    const deptKeyword = deptName.toLowerCase().replace(/department|wing|board|cell/g, "").trim();
    const query = {
      assignedDept: { $regex: new RegExp(deptKeyword || deptName, "i") },
    };

    if (category && category !== "All") query.category = category;
    if (ward && ward !== "All") query.wardId = ward;
    if (priority && priority !== "All") query.priority = priority;

    if (status && status !== "All") {
      if (status === "incoming") {
        query.status = { $in: ["Forwarded to Department", "Verified"] };
      } else if (status === "assigned") {
        query.status = "Work Assigned";
      } else if (status === "ongoing") {
        query.status = { $in: ["Work In Progress", "In Progress", "IN PROGRESS"] };
      } else if (status === "completed") {
        query.status = { $in: ["Work Completed", "Awaiting Admin Verification", "Resolved"] };
      } else {
        query.status = status;
      }
    }

    if (search) {
      const regex = new RegExp(search.trim(), "i");
      query.$or = [{ title: regex }, { description: regex }, { complaintId: regex }, { location: regex }];
    }

    const issues = await Issue.find(query)
      .populate("user", "name email phone points level")
      .sort({ createdAt: -1 });

    res.json(issues);
  } catch (error) {
    console.error("Department complaints error:", error);
    res.status(500).json({ message: "Server error fetching department complaints", error: error.message });
  }
});

// @desc    Department Officer assigns work to staff / field crew
// @route   PUT /api/issues/:id/department-assign
// @access  Private (Department Officer, Admin)
router.put("/:id/department-assign", protect, authorize("department_officer", "admin"), async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Strict Department Access check
    if (!checkDepartmentAccess(req.user, issue.assignedDept)) {
      return res.status(403).json({
        message: `Access denied. Complaint is assigned to '${issue.assignedDept}', not your authorized department.`,
      });
    }

    const {
      assignedTeam,
      assignedStaff,
      staffPhone,
      priority,
      estimatedCompletionDate,
      workInstructions,
    } = req.body;

    if (!assignedStaff && !assignedTeam) {
      return res.status(400).json({ message: "Assigned staff member or field team name is required." });
    }

    const officerName = req.user.name || "Department Supervisor";
    issue.status = "Work Assigned";
    if (priority) issue.priority = priority;

    issue.assignmentDetails = {
      assignedBy: req.user._id,
      officerName,
      assignedAt: new Date(),
      assignedTeam: assignedTeam || "Municipal Field Squad",
      assignedStaff: assignedStaff || "Field Supervisor",
      staffPhone: staffPhone || "",
      priority: priority || issue.priority || "High",
      estimatedCompletionDate: estimatedCompletionDate ? new Date(estimatedCompletionDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      workInstructions: workInstructions || "Inspect site and execute necessary repairs.",
    };

    issue.timeline.push({
      status: "Work Assigned",
      note: `Work assigned to ${assignedStaff || assignedTeam}. Priority: ${priority || issue.priority}. Instructions: "${workInstructions || "Standard civic repair"}"`,
      updatedBy: officerName,
      role: "department_officer",
      date: new Date(),
    });

    await issue.save();

    // Notify citizen and ward officer
    await sendNotification({
      recipientId: issue.user._id || issue.user,
      recipientRole: "citizen",
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Work Order Assigned",
      message: `Work for complaint ${issue.complaintId} has been assigned to ${assignedStaff || assignedTeam}.`,
      type: "work_assigned",
    });

    await notifyWardOfficers({
      wardId: issue.wardId,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Department Assigned Work",
      message: `Department assigned ${issue.complaintId} to ${assignedStaff || assignedTeam}.`,
      type: "work_assigned",
    });

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Department assignment error:", error);
    res.status(500).json({ message: "Server error assigning work", error: error.message });
  }
});

// @desc    Department updates work progress
// @route   PUT /api/issues/:id/department-progress
// @access  Private (Department Officer, Admin)
router.put("/:id/department-progress", protect, authorize("department_officer", "admin"), async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (!checkDepartmentAccess(req.user, issue.assignedDept)) {
      return res.status(403).json({
        message: `Access denied. Complaint belongs to '${issue.assignedDept}', not your authorized department.`,
      });
    }

    const { progress, progressNotes, remarks, action } = req.body;
    const officerName = req.user.name || "Department Officer";

    issue.status = "Work In Progress";
    if (progress !== undefined) {
      issue.progress = Math.min(100, Math.max(0, Number(progress)));
    }
    const noteText = remarks || progressNotes || `Progress updated to ${issue.progress}%`;
    issue.progressNotes = noteText;

    issue.timeline.push({
      status: "Work In Progress",
      note: `Progress Milestone: ${issue.progress}%. ${noteText}`,
      updatedBy: officerName,
      role: "department_officer",
      date: new Date(),
    });

    await issue.save();

    // Notify citizen
    await sendNotification({
      recipientId: issue.user._id || issue.user,
      recipientRole: "citizen",
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Work Progress Updated",
      message: `Work on ${issue.complaintId} is now at ${issue.progress}%. Note: ${noteText}`,
      type: "progress_updated",
    });

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Department progress error:", error);
    res.status(500).json({ message: "Server error updating progress", error: error.message });
  }
});

// @desc    Department marks work completed with before & after photographs
// @route   PUT /api/issues/:id/department-complete
// @access  Private (Department Officer, Admin)
router.put("/:id/department-complete", protect, authorize("department_officer", "admin"), async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (!checkDepartmentAccess(req.user, issue.assignedDept)) {
      return res.status(403).json({
        message: `Access denied. Complaint belongs to '${issue.assignedDept}'.`,
      });
    }

    const { beforeImage, afterImage, completionRemarks } = req.body;
    const officerName = req.user.name || "Department Officer";

    issue.status = "Awaiting Admin Verification";
    issue.progress = 100;
    issue.completionDetails = {
      completedAt: new Date(),
      completedBy: req.user._id,
      officerName,
      beforeImage: beforeImage || issue.image,
      afterImage: afterImage || issue.resolutionImage || "https://images.unsplash.com/photo-1541888946425-d0fbb186a5b7?auto=format&fit=crop&w=800&q=80",
      completionRemarks: completionRemarks || "Field work executed and completed successfully.",
    };

    issue.resolutionImage = issue.completionDetails.afterImage;
    issue.resolutionNote = issue.completionDetails.completionRemarks;

    issue.timeline.push({
      status: "Work Completed",
      note: `Field work completed by ${officerName}. Submitted for Admin verification. Remarks: "${issue.completionDetails.completionRemarks}"`,
      updatedBy: officerName,
      role: "department_officer",
      date: new Date(),
    });

    await issue.save();

    // Notify Citizen, Ward Officer, and Admins
    await sendNotification({
      recipientId: issue.user._id || issue.user,
      recipientRole: "citizen",
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Work Completed — Awaiting Verification",
      message: `Department has completed work on ${issue.complaintId}. Submitted for admin verification.`,
      type: "work_completed",
    });

    await notifyWardOfficers({
      wardId: issue.wardId,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Work Completed in Your Ward",
      message: `Work completed on ${issue.complaintId} by ${issue.assignedDept}.`,
      type: "work_completed",
    });

    await notifyAdmins({
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Work Completed — Action Required",
      message: `Complaint ${issue.complaintId} completed by ${issue.assignedDept} requires admin review.`,
      type: "work_completed",
    });

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Department complete error:", error);
    res.status(500).json({ message: "Server error marking work complete", error: error.message });
  }
});

// ==========================================
// ADMIN VERIFICATION & OVERSIGHT ENDPOINTS
// ==========================================

// @desc    Admin reviews completed project and approves or requests corrections
// @route   PUT /api/issues/:id/admin-verify
// @access  Private (Admin Only)
router.put("/:id/admin-verify", protect, authorize("admin"), async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const { decision, remarks } = req.body;
    const adminName = req.user.name || "System Admin";

    if (decision === "approve" || decision === "resolve") {
      issue.status = "Resolved";
      issue.adminReview = {
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
        adminName,
        approved: true,
        remarks: remarks || "Resolution evidence approved by City Administrator.",
      };

      issue.timeline.push({
        status: "Resolved",
        note: `Approved and verified by Administrator ${adminName}. Issue successfully resolved!`,
        updatedBy: adminName,
        role: "admin",
        date: new Date(),
      });

      // Award +50 XP to citizen reporter
      try {
        if (issue.user) {
          await User.findByIdAndUpdate(issue.user, { $inc: { points: 50 } });
        }
      } catch (e) {
        // non-blocking
      }

      await issue.save();

      // Notify citizen and department officer
      await sendNotification({
        recipientId: issue.user._id || issue.user,
        recipientRole: "citizen",
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "Complaint Resolved!",
        message: `Your complaint (${issue.complaintId}) has been successfully resolved and approved by administration. Please provide your feedback!`,
        type: "complaint_resolved",
      });

      await notifyDepartmentOfficers({
        departmentName: issue.assignedDept,
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "Resolution Approved by Admin",
        message: `Admin verified and approved completion for ${issue.complaintId}.`,
        type: "admin_approved",
      });
    } else if (decision === "corrections_requested" || decision === "reject_work") {
      if (!remarks || remarks.trim().length < 5) {
        return res.status(400).json({
          message: "Detailed correction instructions must be provided when sending work back.",
        });
      }

      issue.status = "Work In Progress";
      issue.progress = 60;
      issue.adminReview = {
        reviewedAt: new Date(),
        reviewedBy: req.user._id,
        adminName,
        approved: false,
        remarks: remarks.trim(),
      };

      issue.timeline.push({
        status: "Work In Progress",
        note: `Sent back for corrections by Admin ${adminName}: "${remarks.trim()}"`,
        updatedBy: adminName,
        role: "admin",
        date: new Date(),
      });

      await issue.save();

      // Notify department officer
      await notifyDepartmentOfficers({
        departmentName: issue.assignedDept,
        issueId: issue._id,
        complaintId: issue.complaintId,
        title: "Corrections Requested on Completed Work",
        message: `Admin requested corrections on ${issue.complaintId}: "${remarks.trim()}". Please re-execute.`,
        type: "corrections_requested",
      });
    } else {
      return res.status(400).json({ message: "Invalid decision. Must be 'approve' or 'corrections_requested'." });
    }

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Admin verify error:", error);
    res.status(500).json({ message: "Server error during admin verification", error: error.message });
  }
});

// @desc    Reopen a resolved complaint (Citizen or Admin)
// @route   POST /api/issues/:id/reopen
// @access  Private (Citizen reporter or Admin)
router.post("/:id/reopen", protect, async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const isAuthor = issue.user?._id?.toString() === req.user._id.toString() || issue.user?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: "Only the reporting citizen or an administrator can reopen this complaint." });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) {
      return res.status(400).json({ message: "Please provide a valid reason for reopening (at least 5 characters)." });
    }

    issue.status = "Reopened";
    issue.progress = 25;
    issue.reopenDetails = {
      reopenedAt: new Date(),
      reopenedBy: req.user._id,
      reopenedByName: req.user.name || "Citizen",
      role: req.user.role,
      reason: reason.trim(),
    };

    issue.timeline.push({
      status: "Reopened",
      note: `Complaint reopened by ${req.user.name} (${req.user.role}). Reason: "${reason.trim()}"`,
      updatedBy: req.user.name,
      role: req.user.role,
      date: new Date(),
    });

    await issue.save();

    // Notify Department and Ward Officer
    await notifyDepartmentOfficers({
      departmentName: issue.assignedDept,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Complaint Reopened",
      message: `Complaint ${issue.complaintId} was reopened: "${reason.trim()}". Requires attention.`,
      type: "complaint_reopened",
    });

    await notifyWardOfficers({
      wardId: issue.wardId,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Complaint Reopened in Your Ward",
      message: `Complaint ${issue.complaintId} has been reopened by citizen.`,
      type: "complaint_reopened",
    });

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Reopen complaint error:", error);
    res.status(500).json({ message: "Server error reopening complaint", error: error.message });
  }
});

// @desc    Citizen submits feedback/rating after resolution
// @route   POST /api/issues/:id/feedback
// @access  Private (Citizen author only)
router.post("/:id/feedback", protect, async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const isAuthor = issue.user?._id?.toString() === req.user._id.toString() || issue.user?.toString() === req.user._id.toString();
    if (!isAuthor && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only the reporting citizen can provide resolution feedback." });
    }

    const { rating, comment } = req.body;
    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5." });
    }

    issue.citizenFeedback = {
      submittedAt: new Date(),
      rating: numRating,
      comment: comment || "",
    };

    issue.timeline.push({
      status: issue.status,
      note: `Citizen feedback received: ${numRating} Stars. "${comment || "No comment"}"`,
      updatedBy: req.user.name,
      role: "citizen",
      date: new Date(),
    });

    await issue.save();

    // Notify Department and Ward Officer
    await notifyDepartmentOfficers({
      departmentName: issue.assignedDept,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Citizen Feedback Received",
      message: `Citizen gave ${numRating} stars on ${issue.complaintId}: "${comment || "Great job!"}"`,
      type: "citizen_feedback",
    });

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Feedback submission error:", error);
    res.status(500).json({ message: "Server error submitting feedback", error: error.message });
  }
});

// @desc    Citizen provides additional information requested by Ward Officer
// @route   POST /api/issues/:id/provide-info
// @access  Private (Citizen author only)
router.post("/:id/provide-info", protect, async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const { additionalInfo, additionalImage } = req.body;
    if (!additionalInfo || additionalInfo.trim().length < 3) {
      return res.status(400).json({ message: "Please provide the requested information." });
    }

    issue.status = "Under Ward Verification";
    if (issue.verificationDetails) {
      issue.verificationDetails.infoProvided = additionalInfo.trim();
      issue.verificationDetails.infoProvidedAt = new Date();
    }
    if (additionalImage) {
      issue.image = additionalImage;
    }

    issue.timeline.push({
      status: "Under Ward Verification",
      note: `Additional information submitted by Citizen: "${additionalInfo.trim()}"`,
      updatedBy: req.user.name,
      role: "citizen",
      date: new Date(),
    });

    await issue.save();

    // Notify Ward Officer
    await notifyWardOfficers({
      wardId: issue.wardId,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: "Additional Info Provided by Citizen",
      message: `Citizen provided requested information for ${issue.complaintId}. Ready for verification.`,
      type: "info_provided",
    });

    const updated = await findIssueByIdOrComplaintId(issue._id);
    res.json(updated);
  } catch (error) {
    console.error("Provide info error:", error);
    res.status(500).json({ message: "Server error submitting additional information", error: error.message });
  }
});

// ==========================================
// STANDARD GENERAL CRUD & INTERACTION ENDPOINTS
// ==========================================

// @desc    Get all issues with optional filtering & search
// @route   GET /api/issues
// @access  Public
router.get("/", async (req, res) => {
  try {
    const { search, category, status, ward, department, limit = 50 } = req.query;
    const query = {};

    if (category && category !== "All" && category !== "All Categories") {
      query.category = category;
    }

    if (status && status !== "All" && status !== "All Status") {
      query.status = status;
    }

    if (ward && ward !== "All") {
      query.wardId = ward;
    }

    if (department && department !== "All") {
      query.assignedDept = { $regex: new RegExp(department, "i") };
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), "i");
      query.$or = [
        { complaintId: searchRegex },
        { title: searchRegex },
        { category: searchRegex },
        { location: searchRegex },
        { description: searchRegex },
      ];
    }

    const issues = await Issue.find(query)
      .populate("user", "name email points level title wardId wardName")
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json(issues);
  } catch (error) {
    console.error("Get Issues Error:", error);
    res.status(500).json({ message: "Server error fetching issues", error: error.message });
  }
});

// @desc    Get single issue by ID or complaintId (Increments views)
// @route   GET /api/issues/:id
// @access  Public
router.get("/:id", async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Increment views
    issue.views = (issue.views || 0) + 1;
    await issue.save();

    res.json(issue);
  } catch (error) {
    console.error("Get Issue Error:", error);
    res.status(500).json({ message: "Server error fetching issue details", error: error.message });
  }
});

// @desc    Create new issue (Citizen)
// @route   POST /api/issues
// @access  Private (Citizen, Officer, Admin)
router.post("/", protect, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      location,
      latitude,
      longitude,
      locationCoords,
      image,
      video,
      wardId,
      wardName,
      aiSeverity,
      aiPriorityScore,
      aiEstimatedDays,
      aiTags,
    } = req.body;

    const normalizedCategory = normalizeCategory(category);
    const cleanLocation = (location && location.trim()) ? location.trim() : (req.user.municipality || "Visakhapatnam, Andhra Pradesh");
    const cleanTitle = (title && title.trim().length >= 3)
      ? title.trim()
      : `${normalizedCategory} Problem at ${cleanLocation.split(",")[0] || "Community"}`;
    const cleanDescription = (description && description.trim().length >= 3)
      ? description.trim()
      : `Citizen reported ${cleanTitle} requiring municipal inspection and timely repair.`;

    const latVal = latitude !== undefined && !isNaN(Number(latitude))
      ? Number(latitude)
      : (locationCoords?.lat || 17.6868);

    const lngVal = longitude !== undefined && !isNaN(Number(longitude))
      ? Number(longitude)
      : (locationCoords?.lng || 83.2185);

    const userWardId = wardId || req.user.wardId || "WARD-04";
    const userWardName = wardName || req.user.wardName || "Duvvada Ward 4";
    const newComplaintId = generateComplaintId();

    // Determine initial department recommendation based on category
    const deptMap = {
      "Roads": "Roads & Infrastructure Department",
      "Waste Management": "Sanitation & Waste Management Board",
      "Water Supply": "Water Supply & Sewerage Board",
      "Street Lights": "Electrical Maintenance Wing",
      "Electricity": "Electrical Maintenance Wing",
      "Drainage": "Drainage & Stormwater Department",
      "Public Safety": "Public Safety Task Force",
      "Parks": "Parks & Environmental Cell",
    };
    const defaultDept = deptMap[normalizedCategory] || "Roads & Infrastructure Department";

    const issue = await Issue.create({
      complaintId: newComplaintId,
      title: cleanTitle,
      category: normalizedCategory,
      description: cleanDescription,
      location: cleanLocation,
      latitude: latVal,
      longitude: lngVal,
      locationCoords: { lat: latVal, lng: lngVal },
      image: image || "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      video: video || "",
      status: "Submitted",
      priority: aiSeverity || "High",
      wardId: userWardId,
      wardName: userWardName,
      assignedDept: defaultDept,
      aiSeverity: aiSeverity || "Medium",
      aiPriorityScore: aiPriorityScore ? Number(aiPriorityScore) : 75,
      aiEstimatedDays: aiEstimatedDays ? Number(aiEstimatedDays) : 3,
      aiTags: Array.isArray(aiTags) && aiTags.length > 0 ? aiTags : ["#CitizenReport"],
      user: req.user._id,
      timeline: [
        {
          status: "Submitted",
          note: `Complaint logged by ${req.user.name || "Citizen Hero"} (+50 XP). Awaiting Ward verification.`,
          updatedBy: req.user.name || "Citizen Hero",
          role: "citizen",
          date: new Date(),
        },
      ],
    });

    // Award +50 XP to user for reporting an issue
    try {
      await User.findByIdAndUpdate(req.user._id, { $inc: { points: 50 } });
    } catch (xpErr) {
      // non-blocking
    }

    // Notify Ward Officers of the assigned ward
    await notifyWardOfficers({
      wardId: userWardId,
      issueId: issue._id,
      complaintId: issue.complaintId,
      title: `New Complaint in ${userWardName}`,
      message: `Citizen reported: "${cleanTitle}" at ${cleanLocation}. Please inspect and verify.`,
      type: "complaint_submitted",
    });

    const populated = await findIssueByIdOrComplaintId(issue._id);
    res.status(201).json(populated || issue);
  } catch (error) {
    console.error("Create Issue Error:", error);
    res.status(500).json({ message: "Server error creating complaint", error: error.message });
  }
});

// @desc    Toggle Like on issue
// @route   POST /api/issues/:id/like
// @access  Private
router.post("/:id/like", protect, async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const userId = req.user._id.toString();
    const existingIndex = issue.likes.findIndex((l) => l.user.toString() === userId);

    let isLiked = false;
    if (existingIndex > -1) {
      issue.likes.splice(existingIndex, 1);
      isLiked = false;
    } else {
      issue.likes.push({ user: req.user._id });
      isLiked = true;
    }

    await issue.save();
    res.json({ message: isLiked ? "Liked report!" : "Unliked report!", likesCount: issue.likes.length, isLiked });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ message: "Server error updating like status", error: error.message });
  }
});

// @desc    Upvote issue (+10 XP to upvoter, +5 XP to reporter)
// @route   POST /api/issues/:id/upvote
// @access  Private
router.post("/:id/upvote", protect, async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const alreadyUpvoted = issue.upvotes.some((u) => u.user.toString() === req.user._id.toString());
    if (alreadyUpvoted) {
      return res.status(400).json({ message: "You have already upvoted this complaint!" });
    }

    issue.upvotes.push({ user: req.user._id });
    await issue.save();

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { points: 10 },
      $addToSet: { upvotedIssues: issue._id },
    });

    if (issue.user) {
      await User.findByIdAndUpdate(issue.user, { $inc: { points: 5 } });
    }

    res.json({ message: "Upvoted! +10 XP awarded to you!", upvotesCount: issue.upvotes.length });
  } catch (error) {
    console.error("Upvote Error:", error);
    res.status(500).json({ message: "Server error upvoting issue", error: error.message });
  }
});

// @desc    Delete issue report (Admin or Author)
// @route   DELETE /api/issues/:id
// @access  Private
router.delete("/:id", protect, async (req, res) => {
  try {
    const issue = await findIssueByIdOrComplaintId(req.params.id);
    if (!issue) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const isAuthor = issue.user?._id?.toString() === req.user._id.toString() || issue.user?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ message: "Access denied. Only the author or an administrator can delete this complaint." });
    }

    await Issue.findByIdAndDelete(issue._id);
    res.json({ message: "Complaint removed successfully", id: issue._id, complaintId: issue.complaintId });
  } catch (error) {
    console.error("Delete Issue Error:", error);
    res.status(500).json({ message: "Server error deleting issue", error: error.message });
  }
});

module.exports = router;
