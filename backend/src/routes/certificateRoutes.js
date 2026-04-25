import { Router } from "express";

import {
  batchGenerateCertificates,
  downloadCertificate,
  generateCertificate,
  getMyCertificates,
  verifyCertificate,
} from "../controllers/certificateController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

const router = Router();

router.get("/verify/:certificateNumber", verifyCertificate);
router.post("/generate", authMiddleware, allowRoles("admin", "coordinator"), generateCertificate);
router.post(
  "/events/:eventId/batch",
  authMiddleware,
  allowRoles("admin", "coordinator"),
  batchGenerateCertificates
);
router.get("/me", authMiddleware, allowRoles("participant"), getMyCertificates);
router.get("/:certificateId/download", authMiddleware, downloadCertificate);

export default router;
