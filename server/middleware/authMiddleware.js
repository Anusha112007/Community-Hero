const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "community_hero_secret_key_2026";

// Normalize user role into standard 4 roles: citizen, ward_officer, department_officer, admin
const normalizeRole = (role) => {
  if (!role) return "citizen";
  const r = role.toLowerCase().trim();
  if (r === "admin" || r.includes("administrator")) return "admin";
  if (r.includes("ward") || r === "officer" || r === "ward_officer") return "ward_officer";
  if (r.includes("dept") || r.includes("district") || r === "department" || r === "department_officer") return "department_officer";
  return "citizen";
};

// Protect middleware: strictly validates JWT Bearer token
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token || token === "null" || token === "undefined") {
    return res.status(401).json({
      message: "Not authorized, token missing. Please sign in.",
      code: "TOKEN_MISSING",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User account for this token no longer exists.",
        code: "USER_NOT_FOUND",
      });
    }

    // Attach normalized role to user object
    user.normalizedRole = normalizeRole(user.role);
    req.user = user;
    return next();
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return res.status(401).json({
      message: "Token is invalid or expired. Please sign in again.",
      code: "TOKEN_INVALID",
    });
  }
};

// Role-based access control middleware
const authorize = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(r => normalizeRole(r));

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const userRole = normalizeRole(req.user.role);

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`,
        requiredRoles: allowedRoles,
        currentRole: req.user.role,
      });
    }

    next();
  };
};

// Helper: Check if user has access to a specific ward's complaints
const checkWardAccess = (user, wardId) => {
  const role = normalizeRole(user?.role);
  if (role === "admin") return true; // Admin has city-wide access
  if (role === "ward_officer") {
    if (!wardId || !user.wardId) return true;
    return user.wardId.trim().toUpperCase() === wardId.trim().toUpperCase();
  }
  return false;
};

// Helper: Check if user has access to a specific department's complaints
const checkDepartmentAccess = (user, departmentName) => {
  const role = normalizeRole(user?.role);
  if (role === "admin") return true; // Admin has city-wide access
  if (role === "department_officer") {
    if (!departmentName || !user.departmentName) return true;
    const userDept = user.departmentName.toLowerCase().replace(/department|wing|board|cell/g, "").trim();
    const targetDept = departmentName.toLowerCase().replace(/department|wing|board|cell/g, "").trim();
    return userDept.includes(targetDept) || targetDept.includes(userDept);
  }
  return false;
};

module.exports = {
  protect,
  authorize,
  normalizeRole,
  checkWardAccess,
  checkDepartmentAccess,
};
