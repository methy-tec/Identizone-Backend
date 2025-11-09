import express from "express";
import upload from "../middlewares/multerMiddlewares.js";
import {
  createPreAdmin,
  getAllPreAdmins,
  getPreAdminById,
  updatePreAdmin,
  deletePreAdmin,
  meConnect,
  updateProfil,
  changePass,
  refreshToken,
  login
} from "../controllers/preAdminController.js";
import { verifyToken , verifyRole} from "../middlewares/authMiddlewares.js";

const router = express.Router();

router.post("/",verifyToken, verifyRole("admin"), upload.single("photo"), createPreAdmin);
router.post("/login", login);

router.get("/list",verifyToken, verifyRole("superadmin", "admin"), getAllPreAdmins);
router.get("/:id", verifyToken, verifyRole("superadmin","admin"), getPreAdminById);
router.get("/me", verifyToken, meConnect);
router.put("/me", verifyToken, upload.single("photo"), updateProfil);
router.put("/me/password", verifyToken, changePass)
router.put("/:id", verifyToken, upload.single("photo"), updatePreAdmin);
router.delete("/:id", verifyToken, verifyRole("superadmin", "admin"), deletePreAdmin);
router.post("/refresh", refreshToken);

export default router;
