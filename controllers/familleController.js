// controllers/familleController.js
import mongoose from "mongoose";
import { Famille, Utilisateur, Habitat } from "../models/index.js";

/**
 * 🔹 Créer une famille
 */
export const createFamille = async (req, res) => {
  try {
    const { nom_complet } = req.body;
    if (!nom_complet || !nom_complet.trim()) {
      return res.status(400).json({ message: "❌ Nom complet requis." });
    }

    if (!req.user) return res.status(401).json({ message: "❌ Utilisateur non authentifié." });

    const { adminId, habitatId, role } = req.user;

    if (!adminId || !habitatId) {
      return res.status(403).json({ message: "❌ Informations admin/habitat manquantes." });
    }

    if (!["admin", "preadmin", "travailleur"].includes(role)) {
      return res.status(403).json({ message: "❌ Rôle non autorisé." });
    }

    // Vérification doublon insensible à la casse
    const existingFamille = await Famille.findOne({
      nom_complet: { $regex: new RegExp(`^${nom_complet.trim()}$`, "i") },
      habitatId,
    });

    if (existingFamille) {
      return res.status(400).json({
        message: "❌ Une famille avec ce nom existe déjà dans cet habitat.",
      });
    }

    const famille = await Famille.create({
      nom_complet: nom_complet.trim(),
      nombre_personne: 0,
      adminId,
      habitatId,
      pereStatut: "vivant",
      mereStatut: "vivant",
    });

    return res.status(201).json({ message: "✅ Famille créée avec succès.", famille });
  } catch (error) {
    console.error("❌ Erreur création famille:", error);
    return res.status(500).json({ message: "❌ Erreur interne.", error: error.message });
  }
};

/**
 * 🔹 Mettre à jour le statut du parent
 */
export const updateStatutParent = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "ID invalide." });

    const famille = await Famille.findById(id);
    if (!famille) return res.status(404).json({ message: "❌ Famille introuvable." });

    const { parent, statut, date_deces } = req.body;
    if (parent === "pere") {
      famille.pereStatut = statut;
      famille.date_deces_pere = statut === "decede" ? date_deces : null;
    } else if (parent === "mere") {
      famille.mereStatut = statut;
      famille.date_deces_mere = statut === "decede" ? date_deces : null;
    } else {
      return res.status(400).json({ message: "Parent invalide (pere ou mere)" });
    }

    await famille.save();
    res.json({ message: "Statut mis à jour ✅", famille });
  } catch (error) {
    console.error("❌ Erreur updateStatutParent:", error);
    res.status(500).json({ message: "❌ Erreur serveur.", error: error.message });
  }
};

/**
 * 🔹 Lister toutes les familles (SuperAdmin)
 */
export const getAllFamilles = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "superadmin") return res.status(403).json({ message: "Accès refusé ❌" });

    const familles = await Famille.find().lean();

    const famillesAvecHabitat = await Promise.all(
      familles.map(async (fam) => {
        let habitat = null;
        if (fam.habitatId && mongoose.Types.ObjectId.isValid(fam.habitatId)) {
          habitat = await Habitat.findById(fam.habitatId).lean();
        }
        return { ...fam, habitat };
      })
    );

    res.json(famillesAvecHabitat);
  } catch (error) {
    console.error("❌ Erreur getAllFamilles:", error);
    res.status(500).json({ message: "❌ Erreur récupération familles.", error: error.message });
  }
};

/**
 * 🔹 Lister familles par rôle utilisateur (Admin / PréAdmin)
 */
export const getFamillesByUser = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "❌ Utilisateur non connecté." });

    let filter = {};
    switch (req.user.role) {
      case "admin":
        filter = { adminId: req.user.adminId || req.user.id };
        break;
      case "preadmin":
        if (!req.user.habitatId) return res.status(403).json({ message: "❌ Habitat manquant pour le préadmin." });
        filter = { habitatId: req.user.habitatId };
        break;
      default:
        return res.status(403).json({ message: "❌ Accès refusé pour ce rôle." });
    }

    const familles = await Famille.find(filter).lean();
    res.json(familles);
  } catch (error) {
    console.error("❌ Erreur getFamillesByUser:", error);
    res.status(500).json({ message: "❌ Erreur récupération familles.", error: error.message });
  }
};

/**
 * 🔹 Récupérer les familles pour un travailleur
 */
export const getFamillesForTravailleur = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "❌ Utilisateur non authentifié." });
    if (req.user.role !== "travailleur") return res.status(403).json({ message: "❌ Accès réservé aux travailleurs." });

    const { adminId } = req.user;
    if (!adminId) return res.status(400).json({ message: "❌ adminId manquant." });

    const familles = await Famille.find({ adminId }).lean();
    res.json(familles);
  } catch (error) {
    console.error("❌ Erreur getFamillesForTravailleur:", error);
    res.status(500).json({ message: "❌ Erreur récupération familles.", error: error.message });
  }
};

/**
 * 🔹 Récupérer une famille par ID
 */
export const getFamilleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "❌ ID invalide." });

    const famille = await Famille.findById(id).lean();
    if (!famille) return res.status(404).json({ message: "❌ Famille introuvable." });

    const habitants = await Utilisateur.find({ familleId: id }).lean();

    res.json({
      message: "✅ Famille trouvée avec succès.",
      famille: { ...famille, nombre_personne: habitants.length, habitants },
    });
  } catch (error) {
    console.error("❌ Erreur getFamilleById:", error);
    res.status(500).json({ message: "❌ Erreur lors du chargement de la famille.", error: error.message });
  }
};

/**
 * 🔹 Mettre à jour une famille
 */
export const updateFamille = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "❌ ID invalide." });

    const famille = await Famille.findById(id);
    if (!famille) return res.status(404).json({ message: "❌ Famille introuvable." });

    const { nom_complet } = req.body;
    famille.nom_complet = nom_complet || famille.nom_complet;

    await famille.save();
    res.json({ message: "Famille modifiée avec succès ✅", famille });
  } catch (error) {
    console.error("❌ Erreur updateFamille:", error);
    res.status(500).json({ message: "❌ Erreur modification famille.", error: error.message });
  }
};

/**
 * 🔹 Supprimer une famille et ses habitants
 */
export const deleteFamille = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "❌ ID invalide." });

    const famille = await Famille.findById(id);
    if (!famille) return res.status(404).json({ message: "❌ Famille introuvable." });

    await Utilisateur.deleteMany({ familleId: id });
    await famille.deleteOne();

    res.json({ message: "Famille et habitants supprimés avec succès ✅" });
  } catch (error) {
    console.error("❌ Erreur deleteFamille:", error);
    res.status(500).json({ message: "❌ Erreur suppression famille.", error: error.message });
  }
};

/**
 * 🔹 Lister familles avec parent décédé
 */
export const getFamillesWithParentsDecedes = async (req, res) => {
  try {
    const familles = await Famille.find()
      .populate({
        path: "pere",
        match: { statut: "decede" },
      })
      .populate({
        path: "mere",
        match: { statut: "decede" },
      })
      .lean();

    const famillesFiltrees = familles.filter(f => f.pere || f.mere);
    res.json(famillesFiltrees);
  } catch (error) {
    console.error("❌ Erreur getFamillesWithParentsDecedes:", error);
    res.status(500).json({ message: "❌ Erreur récupération familles.", error: error.message });
  }
};
