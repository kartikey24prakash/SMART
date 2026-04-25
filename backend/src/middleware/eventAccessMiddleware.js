import Event from "../model/Event.js";

const ensureCoordinatorEventAccess = async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      return next();
    }

    const eventId = req.params.eventId || req.params.id || req.body.eventId;
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const hasAccess = event.coordinators.some(
      (coordinatorId) => coordinatorId.toString() === req.user._id.toString()
    );

    if (!hasAccess) {
      return res.status(403).json({ message: "You are not assigned to this event" });
    }

    req.event = event;
    next();
  } catch (error) {
    next(error);
  }
};

export default ensureCoordinatorEventAccess;
