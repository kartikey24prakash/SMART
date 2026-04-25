import { Router } from "express";

import {
  createTeam,
  getMyTeams,
  getTeamById,
  searchParticipantsByStudentId,
  withdrawTeam,
} from "../controllers/teamController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

const router = Router();

router.get(
  "/participants/search",
  authMiddleware,
  allowRoles("participant"),
  searchParticipantsByStudentId
);
router.get("/me", authMiddleware, allowRoles("participant"), getMyTeams);
router.post("/", authMiddleware, allowRoles("participant"), createTeam);
router.get("/:teamId", authMiddleware, getTeamById);
router.delete("/:teamId/withdraw", authMiddleware, allowRoles("participant"), withdrawTeam);

export default router;
