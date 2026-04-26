import { Router } from "express";

import { answerKnowledgeQuestion } from "../controllers/knowledgeController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = Router();

router.post("/answer", authMiddleware, answerKnowledgeQuestion);

export default router;
