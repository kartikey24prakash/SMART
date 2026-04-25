import { Router } from "express";

import {
  createManagedUser,
  listManagedUsers,
} from "../controllers/adminController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import allowRoles from "../middleware/roleMiddleware.js";

const router = Router();

router.use(authMiddleware, allowRoles("admin"));

router.post("/users", createManagedUser);
router.get("/users", listManagedUsers);

export default router;
