import mongoose from "mongoose";

const certificateSchema = new mongoose.Schema(
  {
    certificateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    certificateType: {
      type: String,
      enum: ["participation", "achievement", "winner"],
      default: "participation",
    },
    rank: Number,
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: Date,
  },
  { timestamps: true }
);

certificateSchema.index({ participantId: 1, eventId: 1, certificateType: 1 }, { unique: true });

const Certificate = mongoose.model("Certificate", certificateSchema);

export default Certificate;
