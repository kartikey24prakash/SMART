import User from "../model/User.js";

const sanitizeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  gender: user.gender,
  institution: user.institution,
  studentId: user.studentId,
  adminId: user.adminId,
  coordinatorId: user.coordinatorId,
  contactNumber: user.contactNumber,
  isActive: user.isActive,
  createdAt: user.createdAt,
});

export const createManagedUser = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      role,
      gender = "other",
      institution,
      studentId,
      adminId,
      coordinatorId,
      contactNumber,
    } = req.body;

    if (!["admin", "coordinator"].includes(role)) {
      return res.status(400).json({
        message: "Role must be either admin or coordinator",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const roleSpecificFields = {};

    if (role === "coordinator") {
      roleSpecificFields.coordinatorId = coordinatorId;
    }

    if (role === "admin") {
      roleSpecificFields.adminId = adminId;
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      gender,
      institution,
      ...roleSpecificFields,
      contactNumber,
    });

    res.status(201).json({
      message: `${role} created successfully`,
      user: sanitizeUser(user),
    });
  } catch (error) {
    next(error);
  }
};

export const listManagedUsers = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.role) {
      query.role = req.query.role;
    }

    const users = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 });

    res.json({
      users,
      count: users.length,
    });
  } catch (error) {
    next(error);
  }
};
