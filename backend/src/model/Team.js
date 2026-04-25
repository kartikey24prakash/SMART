import mongoose from "mongoose";

const teamMemberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["leader", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const teamSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      required: true,
      trim: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [teamMemberSchema],
      default: [],
    },
    registrationDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["registered", "withdrawn", "participated", "absent"],
      default: "registered",
    },
    isWinner: {
      type: Boolean,
      default: false,
    },
    rank: Number,
    withdrawnAt: Date,
    withdrawalReason: String,
    meetsGenderRequirement: {
      type: Boolean,
      default: true,
    },
    meetsTeamSizeRequirement: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

teamSchema.index({ eventId: 1, teamName: 1 }, { unique: true });

const Team = mongoose.model("Team", teamSchema);

export default Team;
