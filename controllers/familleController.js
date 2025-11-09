import { Op, fn, col, where } from "sequelize";

import {Famille, Utilisateur, Habitat} from "../models/index.js";


export const createFamille = async (req, res) => {
  try {
    const { nom_complet } = req.body;

    if (!nom_complet || !nom_complet.trim()) {
      return res.status(400).json({ message: "❌ Nom complet requis." });
    }

    if (!req.user) {
      return res.status(401).json({ message: "❌ Utilisateur non authentifié." });
    }

    const { adminId, habitatId, role } = req.user;

    if (!adminId || !habitatId) {
      return res.status(403).json({ message: "❌ Informations admin/habitat manquantes." });
    }

    if (!["admin", "preadmin", "travailleur"].includes(role)) {
      return res.status(403).json({ message: "❌ Rôle non autorisé." });
    }

    // 🔍 Vérification du doublon insensible à la casse
    const existingFamille = await Famille.findOne({
      nom_complet: { $regex: new RegExp(`^${nom_complet.trim()}$`, "i") }, // insensible à la casse
      habitatId: habitatId,
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

    return res.status(201).json({
      message: "✅ Famille créée avec succès.",
      famille,
    });

  } catch (error) {
    console.error("❌ Erreur création famille:", error);
    return res.status(500).json({
      message: "❌ Erreur interne lors de la création de la famille.",
      error: error.message,
    });
  }
};




// controllers/familleController.js
export const updateStatutParent = async (req, res) => {
  try {
    const { id } = req.params; // id de la famille
    const { parent, statut, date_deces } = req.body;

    const famille = await Famille.findByPk(id);
    if (!famille) return res.status(404).json({ message: "Famille introuvable ❌" });

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
    res.status(500).json({ message: "Erreur serveur ❌", error: error.message });
  }
};
// 🔎 Récupérer les familles avec père ou mère décédé
// 🔎 Récupérer les familles avec père ou mère décédé
export const getFamillesWithParentsDecedes = async (req, res) => {
  try {
    // Récupérer toutes les familles avec virtuals père et mère
    let familles = await Famille.find()
      .populate({
        path: 'pere',
        match: { statut: 'decede' }, // seulement si le père est décédé
        select: 'id nom postnom prenom sexe statut date_deces',
      })
      .populate({
        path: 'mere',
        match: { statut: 'decede' }, // seulement si la mère est décédée
        select: 'id nom postnom prenom sexe statut date_deces',
      })
      .lean();

    // Filtrer pour garder seulement les familles avec au moins un parent décédé
    const famillesFiltrees = familles.filter(f => f.pere || f.mere);

    res.status(200).json(famillesFiltrees);
  } catch (error) {
    console.error("Erreur getFamillesWithParentsDecedes:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération des familles avec parents décédés ❌",
      error: error.message,
    });
  }
};

// 📋 Lister les familles selon le rôle
export const getFamillesByUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "❌ Non autorisé : utilisateur non connecté." });
    }

    let filter = {};

    switch (req.user.role) {
      case "admin":
        filter = { adminId: req.user.adminId || req.user.id };
        break;
      case "preadmin":
        if (!req.user.habitatId) {
          return res.status(403).json({ message: "❌ Habitat manquant pour le préadmin." });
        }
        filter = { habitatId: req.user.habitatId };
        break;
      default:
        return res.status(403).json({ message: "❌ Accès refusé pour ce rôle." });
    }

    // 🔗 Récupérer les familles + peupler pere et mere
    const familles = await Famille.find(filter)
      .populate("pere", "id nom postnom prenom statut date_deces")
      .populate("mere", "id nom postnom prenom statut date_deces")
      .lean();

    return res.status(200).json(familles);
  } catch (error) {
    console.error("❌ Erreur getFamillesByUser:", error);
    return res.status(500).json({
      message: "❌ Erreur lors de la récupération des familles",
      error: error.message,
    });
  }
};


export const updateFamille = async (req, res) => {
  try {
    const { id } = req.params;
    const { nom_complet, pereId, mereId } = req.body;

    if (!req.user) {
      return res.status(401).json({ message: "Non autorisé ❌" });
    }

    // Vérifier si la famille existe
    const famille = await Famille.findOne({ id: id });
    if (!famille) {
      return res.status(404).json({ message: "Famille introuvable ❌" });
    }

    // Vérifier droits d’accès
    if (req.user.role === "admin" && famille.adminId !== req.user.id) {
      return res.status(403).json({ message: "Vous ne pouvez modifier que vos familles ❌" });
    }
    if (req.user.role === "preadmin" && famille.habitatId !== req.user.habitatId) {
      return res.status(403).json({ message: "Vous ne pouvez modifier que les familles de votre habitat ❌" });
    }

    // Mise à jour des champs
    famille.nom_complet = nom_complet || famille.nom_complet;
    famille.pereId = pereId || famille.pereId;
    famille.mereId = mereId || famille.mereId;

    // Sauvegarde
    await famille.save();

    res.json({ message: "Famille modifiée avec succès ✅", famille });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la modification de la famille ❌",
      error: error.message,
    });
  }
};

/**
 * 🗑️ Supprimer une famille et ses utilisateurs liés
 */
export const deleteFamille = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Non autorisé ❌" });
    }

    // Vérifier si la famille existe
    const famille = await Famille.findOne({ id: id });
    if (!famille) {
      return res.status(404).json({ message: "Famille introuvable ❌" });
    }

    // Vérifier droits d’accès
    if (req.user.role === "admin" && famille.adminId !== req.user.id) {
      return res.status(403).json({ message: "Vous ne pouvez supprimer que vos familles ❌" });
    }
    if (req.user.role === "preadmin" && famille.habitatId !== req.user.habitatId) {
      return res.status(403).json({ message: "Vous ne pouvez supprimer que les familles de votre habitat ❌" });
    }

    // Supprimer les utilisateurs liés à la famille
    await Utilisateur.deleteMany({ familleId: id });

    // Supprimer la famille
    await famille.deleteOne();

    res.json({ message: "Famille et utilisateurs associés supprimés avec succès ✅" });
  } catch (error) {
    res.status(500).json({
      message: "Erreur lors de la suppression de la famille ❌",
      error: error.message,
    });
  }
};


/**
 * 📋 Lister TOUTES les familles (SuperAdmin)
 */
export const getAllFamilles = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Accès refusé ❌" });
    }

    const familles = await Famille.find()
      .populate('pere')  // virtual pour le père
      .populate('mere')  // virtual pour la mère
      .lean();

    // Récupérer manuellement les habitats (car habitatId est un String)
    const famillesAvecHabitat = await Promise.all(
      familles.map(async (fam) => {
        let habitat = null;
        if (fam.habitatId) {
          habitat = await Habitat.findOne({ id: fam.habitatId }).lean();
        }
        return { ...fam, habitat };
      })
    );

    res.json(famillesAvecHabitat);
  } catch (error) {
    console.error("Erreur getAllFamilles:", error);
    res.status(500).json({
      message: "Erreur lors de la récupération de toutes les familles ❌",
      error: error.message,
    });
  }
};



