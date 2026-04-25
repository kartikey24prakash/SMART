import mongoose from "mongoose";

import Event from "../model/Event.js";
import Registration from "../model/Registration.js";
import Team from "../model/Team.js";
import User from "../model/User.js";

const ADMIN_EDITABLE_FIELDS = ["name", "description"];
const COORDINATOR_EDITABLE_FIELDS = [
  "eventType",
  "participationType",
  "teamConfig",
  "registrationStartDate",
  "registrationEndDate",
  "maxParticipants",
  "eventDate",
  "venue",
  "rules",
  "prizes",
];

const pickFields = (payload, allowedFields) =>
  Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
  );

const validateEventPayload = (payload) => {
  if (
    payload.participationType === "team" &&
    payload.teamConfig?.minTeamSize &&
    payload.teamConfig?.maxTeamSize &&
    payload.teamConfig.maxTeamSize < payload.teamConfig.minTeamSize
  ) {
    return "maxTeamSize cannot be smaller than minTeamSize";
  }

  const start = payload.registrationStartDate ? new Date(payload.registrationStartDate) : null;
  const end = payload.registrationEndDate ? new Date(payload.registrationEndDate) : null;
  const eventDate = payload.eventDate ? new Date(payload.eventDate) : null;

  if (start && end && end < start) {
    return "registrationEndDate must be after registrationStartDate";
  }

  if (end && eventDate && eventDate < end) {
    return "eventDate must be after registrationEndDate";
  }

  return null;
};

const enrichEventsWithCounts = async (events) => {
  return Promise.all(
    events.map(async (event) => {
      const [registrationsCount, teams] = await Promise.all([
        Registration.countDocuments({
          eventId: event._id,
          status: { $ne: "withdrawn" },
        }),
        Team.find({
          eventId: event._id,
          status: { $ne: "withdrawn" },
        }).select("members"),
      ]);

      const teamParticipants = teams.reduce((sum, team) => sum + team.members.length, 0);

      return {
        ...event.toObject(),
        stats: {
          registrationsCount,
          teamsCount: teams.length,
          totalParticipants: registrationsCount + teamParticipants,
        },
      };
    })
  );
};

export const createEvent = async (req, res, next) => {
  try {
    if (!req.body.name?.trim()) {
      return res.status(400).json({ message: "Event name is required" });
    }

    const event = await Event.create({
      name: req.body.name,
      description: req.body.description,
      createdBy: req.user._id,
    });

    res.status(201).json({ event });
  } catch (error) {
    next(error);
  }
};

export const getEvents = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.type) {
      query.eventType = req.query.type;
    }

    if (req.user?.role === "coordinator") {
      query.coordinators = req.user._id;
    }

    const events = await Event.find(query)
      .populate("createdBy", "name email role")
      .populate("coordinators", "name email role coordinatorId")
      .sort({ createdAt: -1 });

    const enrichedEvents = await enrichEventsWithCounts(events);

    res.json({ events: enrichedEvents, count: enrichedEvents.length });
  } catch (error) {
    next(error);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("coordinators", "name email role coordinatorId");

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [registrationsCount, teams] = await Promise.all([
      Registration.countDocuments({
        eventId: event._id,
        status: { $ne: "withdrawn" },
      }),
      Team.find({
        eventId: event._id,
        status: { $ne: "withdrawn" },
      }).select("members"),
    ]);

    const teamParticipants = teams.reduce((sum, team) => sum + team.members.length, 0);

    res.json({
      event,
      stats: {
        registrationsCount,
        teamsCount: teams.length,
        totalParticipants: registrationsCount + teamParticipants,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const payload = pickFields(req.body, ADMIN_EDITABLE_FIELDS);

    if (!payload.name?.trim()) {
      return res.status(400).json({ message: "Event name is required" });
    }

    const event = await Event.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ event });
  } catch (error) {
    next(error);
  }
};

export const updateEventConfiguration = async (req, res, next) => {
  try {
    const payload = pickFields(req.body, COORDINATOR_EDITABLE_FIELDS);
    const validationError = validateEventPayload(payload);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const event = await Event.findByIdAndUpdate(req.params.eventId, payload, {
      new: true,
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ event, message: "Event configuration updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const assignCoordinator = async (req, res, next) => {
  try {
    const { coordinatorId } = req.body;
    const coordinatorQuery = {
      role: "coordinator",
      $or: [{ coordinatorId }],
    };

    if (mongoose.isValidObjectId(coordinatorId)) {
      coordinatorQuery.$or.push({ _id: coordinatorId });
    }

    const coordinator = await User.findOne(coordinatorQuery);

    if (!coordinator || coordinator.role !== "coordinator") {
      return res.status(400).json({ message: "Valid coordinator is required" });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const alreadyAssigned = event.coordinators.some(
      (id) => id.toString() === coordinator._id.toString()
    );

    if (!alreadyAssigned) {
      event.coordinators.push(coordinator._id);
      await event.save();
    }

    await event.populate("coordinators", "name email role coordinatorId");
    res.json({ message: "Coordinator assigned", event });
  } catch (error) {
    next(error);
  }
};

export const removeCoordinator = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    let coordinatorObjectId = req.params.coordinatorId;

    if (!mongoose.isValidObjectId(req.params.coordinatorId)) {
      const coordinator = await User.findOne({
        role: "coordinator",
        coordinatorId: req.params.coordinatorId,
      }).select("_id");

      if (!coordinator) {
        return res.status(404).json({ message: "Coordinator not found" });
      }

      coordinatorObjectId = coordinator._id.toString();
    }

    event.coordinators = event.coordinators.filter(
      (coordinatorId) => coordinatorId.toString() !== coordinatorObjectId
    );
    await event.save();

    await event.populate("coordinators", "name email role coordinatorId");
    res.json({ message: "Coordinator removed", event });
  } catch (error) {
    next(error);
  }
};

export const updateEventLifecycleStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!["ongoing", "completed"].includes(status)) {
      return res.status(400).json({
        message: "Status can only be updated to ongoing or completed from this endpoint",
      });
    }

    const event = await Event.findById(req.params.eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    if (status === "completed") {
      const [participatedRegistrations, participatedTeams] = await Promise.all([
        Registration.countDocuments({
          eventId: event._id,
          status: "participated",
        }),
        Team.countDocuments({
          eventId: event._id,
          status: "participated",
        }),
      ]);

      if (participatedRegistrations === 0 && participatedTeams === 0) {
        return res.status(400).json({
          message: "Mark at least one participant or team as participated before completing the event",
        });
      }
    }

    event.status = status;
    await event.save();

    res.json({
      message: `Event marked as ${status}`,
      event,
    });
  } catch (error) {
    next(error);
  }
};
