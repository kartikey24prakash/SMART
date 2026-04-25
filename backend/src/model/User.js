import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const normalizeStudentId = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toUpperCase();
  return normalized || undefined;
};

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["admin", "coordinator", "participant"],
      default: "participant",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    institution: {
      type: String,
      trim: true,
    },
    studentId: {
      type: String,
      trim: true,
      set: normalizeStudentId,
      required: function requireParticipantStudentId() {
        return this.role === "participant";
      },
    },
    adminId: {
      type: String,
      trim: true,
    },
    coordinatorId: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function savePassword() {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

userSchema.index(
  { studentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      role: "participant",
      studentId: { $exists: true, $type: "string" },
    },
  }
);

const User = mongoose.model("User", userSchema);

export default User;
