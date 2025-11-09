import express from "express";
import { createFamille, updateStatutParent, getFamillesWithParentsDecedes, getFamillesByUser, updateFamille, deleteFamille, getAllFamilles } from "../controllers/familleController.js";
import { verifyToken, verifyRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

router.post("/",verifyToken, createFamille);

router.put("/:id/update-parent", verifyToken, verifyRole("admin", "preadmin"), updateStatutParent);
// 📋 Voir les familles avec au moins un parent décédé
router.get("/parents-decedes", verifyToken, verifyRole("admin", "preadmin"), getFamillesWithParentsDecedes);

// 📋 Admin ou PréAdmin → voit uniquement les familles qui lui sont liées
router.get("/mes-familles", verifyToken, getFamillesByUser);

//Super Admin voir tout les famille
router.get("/list", verifyToken, getAllFamilles);

// ✏️ Modifier une famille
router.put("/:id", verifyToken, updateFamille);

// 🗑️ Supprimer une famille (et ses utilisateurs)
router.delete("/:id", verifyToken, verifyRole("admin"), deleteFamille);
export default router;
