import User from "../model/User.js";
import generateToken from "../utils/generateToken.js";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

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

export const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      gender = "other",
      institution,
      studentId,
      contactNumber,
    } = req.body;

    if (req.body.role && req.body.role !== "participant") {
      return res.status(403).json({
        message: "Public registration is only available for participants",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "participant",
      gender,
      institution,
      studentId,
      contactNumber,
    });

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);

    res.status(201).json({
      user: sanitizeUser(user),
      message: "Participant registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = generateToken(user);
    res.cookie("token", token, cookieOptions);

    res.json({
      user: sanitizeUser(user),
      message: "Login successful",
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: req.user });
};

export const logout = async (_req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });

  res.json({ message: "Logout successful" });
};
