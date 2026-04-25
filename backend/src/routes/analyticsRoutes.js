import { Router } from "express";

import {
  getAdminEventsReport,
  getAdminCoordinatorAnalytics,
  getCoordinatorEventWorkspace,
  getCoordinatorSummary,
  getEventAttendanceAnalytics,
  getEventAnalytics,
  getEventBreakdowns,
  getEventCertificateAnalytics,
  getEventWinnerSummary,
  getOverviewAnalytics,
} from "../controllers/analyticsController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import ensureCoordinatorEventAccess from "../middleware/eventAccessMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/overview", authMiddleware, allowRoles("admin"), getOverviewAnalytics);
router.get("/coordinator/me", authMiddleware, allowRoles("coordinator"), getCoordinatorSummary);
router.get(
  "/admin/coordinators",
  authMiddleware,
  allowRoles("admin"),
  getAdminCoordinatorAnalytics
);
router.get("/events", authMiddleware, allowRoles("admin"), getAdminEventsReport);
router.get(
  "/events/:eventId/workspace",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getCoordinatorEventWorkspace
);
router.get(
  "/events/:eventId",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventAnalytics
);
router.get(
  "/events/:eventId/attendance",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventAttendanceAnalytics
);
router.get(
  "/events/:eventId/certificates",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventCertificateAnalytics
);
router.get(
  "/events/:eventId/winners/summary",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventWinnerSummary
);
router.get(
  "/events/:eventId/breakdowns",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  ensureCoordinatorEventAccess,
  getEventBreakdowns
);

export default router;
