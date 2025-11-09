import express from "express";
import { register, login, refreshToken, getStatistics } from "../controllers/superAdminController.js";
import { verifyToken, verifyRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// Routes superadmin
router.post("/register", register);
router.post("/login", login);
router.post("/refresh", refreshToken);

// Route protégée test
router.get("/only", verifyToken, verifyRole("superadmin"), (req, res) => {
  res.json({ message: "Bienvenue SuperAdmin ✅" });
});

// Statistiques
router.get("/statistics", verifyToken, verifyRole("superadmin"), getStatistics);

export default router;
