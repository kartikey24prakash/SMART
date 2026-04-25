import { Router } from "express";

import {
  assignCoordinator,
  createEvent,
  deleteEvent,
  getEventById,
  getEvents,
  removeCoordinator,
  updateEventConfiguration,
  updateEventLifecycleStatus,
  updateEvent,
} from "../controllers/eventController.js";
import {
  getEventRegistrations,
  removeRegistrationByManager,
  updateRegistrationParticipationStatus,
} from "../controllers/registerationController.js";
import {
  getEventTeams,
  removeTeamByManager,
  updateTeamParticipationStatus,
} from "../controllers/teamController.js";
import { clearWinner, getWinners, markWinner } from "../controllers/winnerController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import ensureCoordinatorEventAccess from "../middleware/eventAccessMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/", getEvents);
router.get("/:id", getEventById);

router.post("/", authMiddleware, allowRoles("admin"), createEvent);
router.put("/:id", authMiddleware, allowRoles("admin"), updateEvent);
router.delete("/:id", authMiddleware, allowRoles("admin"), deleteEvent);
router.patch(
  "/:eventId/configuration",
  authMiddleware,
  allowRoles("coordinator"),
  ensureCoordinatorEventAccess,
  updateEventConfiguration
);

router.post("/:eventId/coordinators", authMiddleware, allowRoles("admin"), assignCoordinator);
router.delete(
  "/:eventId/coordinators/:coordinatorId",
  authMiddleware,
  allowRoles("admin"),
  removeCoordinator
);

router.get(
  "/:eventId/registrations",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventRegistrations
);

router.get(
  "/:eventId/teams",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventTeams
);

router.delete(
  "/:eventId/registrations/:registrationId",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  removeRegistrationByManager
);

router.delete(
  "/:eventId/teams/:teamId",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  removeTeamByManager
);

router.patch(
  "/:eventId/status",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  updateEventLifecycleStatus
);

router.patch(
  "/:eventId/registrations/:registrationId/status",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  updateRegistrationParticipationStatus
);

router.patch(
  "/:eventId/teams/:teamId/status",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  updateTeamParticipationStatus
);

router.post(
  "/:eventId/winners",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  markWinner
);

router.get(
  "/:eventId/winners",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getWinners
);

router.delete(
  "/:eventId/winners",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  clearWinner
);

export default router;
