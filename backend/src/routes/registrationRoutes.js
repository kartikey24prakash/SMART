import { Router } from "express";

import {
  createRegistration,
  getMyRegistrations,
  withdrawRegistration,
} from "../controllers/registerationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

const router = Router();

router.post("/", authMiddleware, allowRoles("participant"), createRegistration);
router.get("/me", authMiddleware, allowRoles("participant"), getMyRegistrations);
router.delete("/:registrationId", authMiddleware, allowRoles("participant"), withdrawRegistration);

export default router;
