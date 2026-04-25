import Event from "../model/Event.js";
import Team from "../model/Team.js";
import User from "../model/User.js";
import { validateTeamAgainstEvent } from "../utils/teamValidation.js";

const isRegistrationOpen = (event) => {
  const now = new Date();

  if (event.status && !["open", "ongoing"].includes(event.status)) {
    return false;
  }

  if (event.registrationStartDate && now < new Date(event.registrationStartDate)) {
    return false;
  }

  if (event.registrationEndDate && now > new Date(event.registrationEndDate)) {
    return false;
  }

  return true;
};

export const searchParticipantsByStudentId = async (req, res, next) => {
  try {
    const { studentId, eventId } = req.query;

    if (!studentId?.trim()) {
      return res.status(400).json({ message: "studentId query is required" });
    }

    const query = {
      role: "participant",
      isActive: true,
      studentId: { $regex: `^${studentId.trim()}`, $options: "i" },
      _id: { $ne: req.user._id },
    };

    const users = await User.find(query)
      .select("name email studentId institution gender")
      .limit(10);

    if (eventId) {
      const event = await Event.findById(eventId);

      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      if (event.participationType !== "team") {
        return res.status(400).json({ message: "This event does not allow team participation" });
      }
    }

    res.json({
      users,
      count: users.length,
    });
  } catch (error) {
    next(error);
  }
};

export const createTeam = async (req, res, next) => {
  try {
    const { teamName, eventId, members = [] } = req.body;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.participationType !== "team") {
      return res.status(400).json({ message: "This event does not allow team participation" });
    }

    if (!isRegistrationOpen(event)) {
      return res.status(400).json({ message: "Registration is not open for this event" });
    }

    const memberIds = [...new Set([req.user._id.toString(), ...members])];
    const users = await User.find({ _id: { $in: memberIds } });

    if (users.length !== memberIds.length) {
      return res.status(400).json({ message: "One or more team members are invalid" });
    }

    const hasNonParticipant = users.some((user) => user.role !== "participant" || !user.isActive);
    if (hasNonParticipant) {
      return res.status(400).json({ message: "Only active participants can be added to a team" });
    }

    const conflictingTeams = await Team.find({
      eventId,
      status: { $ne: "withdrawn" },
      "members.userId": { $in: memberIds },
    }).select("teamName members");

    if (conflictingTeams.length > 0) {
      return res.status(409).json({
        message: "One or more selected students are already part of another team in this event",
      });
    }

    if (event.maxParticipants) {
      const activeTeams = await Team.find({
        eventId,
        status: { $ne: "withdrawn" },
      }).select("members");

      const existingParticipants = activeTeams.reduce(
        (sum, team) => sum + team.members.length,
        0
      );

      if (existingParticipants + memberIds.length > event.maxParticipants) {
        return res.status(400).json({ message: "Event capacity has been reached" });
      }
    }

    const validation = validateTeamAgainstEvent(users, event);
    if (!validation.meetsTeamSizeRequirement) {
      return res.status(400).json({ message: "Team size does not match event rules" });
    }

    if (!validation.meetsGenderRequirement) {
      return res.status(400).json({ message: "Team does not satisfy gender requirement" });
    }

    const team = await Team.create({
      teamName,
      eventId,
      leaderId: req.user._id,
      members: memberIds.map((userId) => ({
        userId,
        role: userId === req.user._id.toString() ? "leader" : "member",
      })),
      ...validation,
    });

    await team.populate("members.userId", "name email gender institution");
    res.status(201).json({ team });
  } catch (error) {
    next(error);
  }
};

export const getTeamById = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate("leaderId", "name email studentId contactNumber")
      .populate("members.userId", "name email gender institution studentId contactNumber")
      .populate("eventId", "name participationType");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    res.json({ team });
  } catch (error) {
    next(error);
  }
};

export const getMyTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ "members.userId": req.user._id })
      .populate("leaderId", "name email studentId contactNumber")
      .populate("eventId", "name eventType participationType eventDate venue status")
      .populate("members.userId", "name email gender institution studentId contactNumber")
      .sort({ createdAt: -1 });

    res.json({ teams, count: teams.length });
  } catch (error) {
    next(error);
  }
};

export const withdrawTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.leaderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only team leader can withdraw the team" });
    }

    team.status = "withdrawn";
    team.withdrawnAt = new Date();
    team.withdrawalReason = req.body.reason || "";
    await team.save();

    res.json({ message: "Team withdrawn successfully", team });
  } catch (error) {
    next(error);
  }
};

export const getEventTeams = async (req, res, next) => {
  try {
    const teams = await Team.find({ eventId: req.params.eventId })
      .populate("leaderId", "name email studentId contactNumber")
      .populate("members.userId", "name email gender institution studentId contactNumber");

    res.json({ teams, count: teams.length });
  } catch (error) {
    next(error);
  }
};

export const updateTeamParticipationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["participated", "absent", "registered"].includes(status)) {
      return res.status(400).json({
        message: "Status must be participated, absent, or registered",
      });
    }

    const team = await Team.findById(req.params.teamId)
      .populate("leaderId", "name email studentId")
      .populate("eventId", "name status participationType");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.eventId._id.toString() !== req.params.eventId) {
      return res.status(400).json({ message: "Team does not belong to this event" });
    }

    if (team.status === "withdrawn") {
      return res.status(400).json({ message: "Withdrawn teams cannot be updated" });
    }

    if (team.eventId.participationType !== "team") {
      return res.status(400).json({ message: "Use participant controls for individual events" });
    }

    team.status = status;

    if (status !== "participated") {
      team.isWinner = false;
      team.rank = undefined;
    }

    await team.save();

    res.json({
      message: "Team status updated successfully",
      team,
    });
  } catch (error) {
    next(error);
  }
};

export const removeTeamByManager = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId)
      .populate("leaderId", "name email studentId")
      .populate("eventId", "name");

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    if (team.eventId._id.toString() !== req.params.eventId) {
      return res.status(400).json({ message: "Team does not belong to this event" });
    }

    await Team.findByIdAndDelete(req.params.teamId);

    res.json({
      message: "Team removed from event successfully",
      removedTeam: {
        _id: team._id,
        teamName: team.teamName,
        leader: team.leaderId,
      },
      event: team.eventId,
    });
  } catch (error) {
    next(error);
  }
};
