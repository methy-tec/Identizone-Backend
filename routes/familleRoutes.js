import express from "express";
import { createFamille, updateStatutParent, getFamillesWithParentsDecedes, getFamillesByUser, updateFamille, getFamillesForTravailleur, deleteFamille, getAllFamilles, getFamilleById } from "../controllers/familleController.js";
import { verifyToken, verifyRole } from "../middlewares/authMiddlewares.js";

const router = express.Router();

router.post("/",verifyToken, createFamille);


//Super Admin voir tout les famille
router.get("/list", verifyToken, getAllFamilles);

router.put("/:id/update-parent", verifyToken, verifyRole("admin", "preadmin"), updateStatutParent);
// 📋 Voir les familles avec au moins un parent décédé
router.get("/parents-decedes", verifyToken, verifyRole("admin", "preadmin"), getFamillesWithParentsDecedes);

// 📋 Admin ou PréAdmin → voit uniquement les familles qui lui sont liées
router.get("/mes-familles", verifyToken, getFamillesByUser);


router.get("/:id", verifyToken, getFamilleById); // ✅ voir une famille par ID


//Travailleur voir la famille qui on le meme id
router.get("/list/tra", verifyToken, getFamillesForTravailleur)

// ✏️ Modifier une famille
router.put("/:id", verifyToken, updateFamille);

// 🗑️ Supprimer une famille (et ses utilisateurs)
router.delete("/:id", verifyToken, verifyRole("admin"), deleteFamille);
export default router;
