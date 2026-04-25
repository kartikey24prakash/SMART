import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    eventType: {
      type: String,
      enum: ["technical", "cultural", "sports", "academic", "other"],
      default: "other",
    },
    participationType: {
      type: String,
      enum: ["individual", "team"],
      default: "individual",
    },
    teamConfig: {
      minTeamSize: {
        type: Number,
        default: 1,
      },
      maxTeamSize: {
        type: Number,
        default: 1,
      },
      genderRequirement: {
        type: String,
        enum: ["none", "at least 1 female", "at least 1 male", "mixed"],
        default: "none",
      },
      allowCrossInstitution: {
        type: Boolean,
        default: true,
      },
    },
    registrationStartDate: Date,
    registrationEndDate: Date,
    maxParticipants: Number,
    eventDate: Date,
    venue: {
      type: String,
      trim: true,
    },
    coordinators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    status: {
      type: String,
      enum: ["draft", "open", "ongoing", "completed", "cancelled"],
      default: "draft",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    rules: String,
    prizes: [String],
  },
  { timestamps: true }
);

eventSchema.index({ status: 1 });
eventSchema.index({ eventDate: 1 });
eventSchema.index({ coordinators: 1 });

const Event = mongoose.model("Event", eventSchema);

export default Event;
