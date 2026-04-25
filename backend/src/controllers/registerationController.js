import Event from "../model/Event.js";
import Registration from "../model/Registration.js";
import Team from "../model/Team.js";

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

export const createRegistration = async (req, res, next) => {
  try {
    const { eventId } = req.body;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (event.participationType !== "individual") {
      return res.status(400).json({ message: "Use team registration for this event" });
    }

    if (!isRegistrationOpen(event)) {
      return res.status(400).json({ message: "Registration is not open for this event" });
    }

    const existingRegistration = await Registration.findOne({
      eventId,
      participantId: req.user._id,
    });

    if (existingRegistration) {
      return res.status(409).json({ message: "You are already registered for this event" });
    }

    if (event.maxParticipants) {
      const registeredCount = await Registration.countDocuments({
        eventId,
        status: { $ne: "withdrawn" },
      });

      if (registeredCount >= event.maxParticipants) {
        return res.status(400).json({ message: "Event capacity has been reached" });
      }
    }

    const registration = await Registration.create({
      eventId,
      participantId: req.user._id,
    });

    res.status(201).json({ registration });
  } catch (error) {
    next(error);
  }
};

export const withdrawRegistration = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.registrationId);

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.participantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only withdraw your own registration" });
    }

    registration.status = "withdrawn";
    registration.withdrawnAt = new Date();
    registration.withdrawalReason = req.body.reason || "";
    await registration.save();

    res.json({ message: "Registration withdrawn successfully", registration });
  } catch (error) {
    next(error);
  }
};

export const getMyRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ participantId: req.user._id }).populate(
      "eventId"
    );

    res.json({ registrations });
  } catch (error) {
    next(error);
  }
};

export const getEventRegistrations = async (req, res, next) => {
  try {
    const registrations = await Registration.find({ eventId: req.params.eventId })
      .populate("participantId", "name email gender institution studentId contactNumber")
      .populate("eventId", "name eventType participationType");

    res.json({ registrations, count: registrations.length });
  } catch (error) {
    next(error);
  }
};

export const updateRegistrationParticipationStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["participated", "absent", "registered"].includes(status)) {
      return res.status(400).json({
        message: "Status must be participated, absent, or registered",
      });
    }

    const registration = await Registration.findById(req.params.registrationId)
      .populate("participantId", "name email studentId")
      .populate("eventId", "name status participationType");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.eventId._id.toString() !== req.params.eventId) {
      return res.status(400).json({ message: "Registration does not belong to this event" });
    }

    if (registration.status === "withdrawn") {
      return res.status(400).json({ message: "Withdrawn registrations cannot be updated" });
    }

    if (registration.eventId.participationType !== "individual") {
      return res.status(400).json({ message: "Use team participation controls for team events" });
    }

    registration.status = status;

    if (status !== "participated") {
      registration.isWinner = false;
      registration.rank = undefined;
    }

    await registration.save();

    res.json({
      message: "Participant status updated successfully",
      registration,
    });
  } catch (error) {
    next(error);
  }
};

export const removeRegistrationByManager = async (req, res, next) => {
  try {
    const registration = await Registration.findById(req.params.registrationId)
      .populate("participantId", "name email studentId")
      .populate("eventId", "name");

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    if (registration.eventId._id.toString() !== req.params.eventId) {
      return res.status(400).json({ message: "Registration does not belong to this event" });
    }

    await Registration.findByIdAndDelete(req.params.registrationId);

    res.json({
      message: "Participant removed from event successfully",
      removedParticipant: registration.participantId,
      event: registration.eventId,
    });
  } catch (error) {
    next(error);
  }
};

export const getEventParticipationSummary = async (eventId) => {
  const [registrationsCount, teams, activeRegistrations] = await Promise.all([
    Registration.countDocuments({ eventId, status: { $ne: "withdrawn" } }),
    Team.find({ eventId, status: { $ne: "withdrawn" } }).select("members"),
    Registration.find({ eventId, status: { $ne: "withdrawn" } }).select("participantId"),
  ]);

  const teamParticipantsCount = teams.reduce((sum, team) => sum + team.members.length, 0);

  return {
    registrationsCount,
    teamsCount: teams.length,
    totalParticipants: registrationsCount + teamParticipantsCount,
    individualParticipantIds: activeRegistrations.map((item) => item.participantId.toString()),
  };
};
