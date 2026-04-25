import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    participantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  { timestamps: true }
);

registrationSchema.index({ eventId: 1, participantId: 1 }, { unique: true });
registrationSchema.index({ status: 1 });

const Registration = mongoose.model("Registration", registrationSchema);

export default Registration;
