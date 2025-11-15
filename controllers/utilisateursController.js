import { Utilisateur,Admin, PreAdmin, Habitat, Famille } from "../models/index.js";
import moment from "moment";

export const registerUtilisateur = async (req, res) => {
  try {
    const {
      nom,
      postnom,
      prenom,
      lieu_naissance,
      date_naissance,
      sexe,
      niveau_etude,
      numero_tel,
      adresse,
      nationalite,
      etat_civil,
      profession,
      familleId,
    } = req.body;

    if (!familleId || !nom || !prenom || !date_naissance) {
      return res.status(400).json({
        message: "⚠️ Champs manquants : familleId, nom, prenom et date_naissance sont obligatoires.",
      });
    }

    // ✅ Chercher la famille via son id personnalisé
    const famille = await Famille.findOne({ id: familleId });
    if (!famille) {
      return res.status(404).json({ message: "❌ Famille introuvable" });
    }

    // ✅ Formater la date
    const parsedDate = moment(date_naissance, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
    if (!parsedDate.isValid()) {
      return res.status(400).json({ message: "❌ Format de date invalide." });
    }
    const isoDate = parsedDate.format("YYYY-MM-DD");

    // ✅ Vérifier doublon dans la même famille
    const doublon = await Utilisateur.findOne({
      nom,
      postnom,
      prenom,
      date_naissance: isoDate,
      familleId,
    });
    if (doublon) {
      return res.status(400).json({ message: "❌ Cet utilisateur existe déjà dans cette famille." });
    }

    // ✅ Créer l'utilisateur
    const utilisateur = await Utilisateur.create({
      nom,
      postnom,
      prenom,
      lieu_naissance,
      date_naissance: isoDate,
      sexe,
      nationalite,
      niveau_etude,
      etat_civil,
      numero_tel,
      adresse,
      photo: req.file?.filename || null,
      profession,
      familleId,
      adminId: req.user?.adminId || null,
      habitatId: req.user?.habitatId || null,
    });

    // ✅ Mettre à jour la famille si père ou mère manquant
    if (sexe === "M" && !famille.pereId) {
      famille.pereId = utilisateur.id;
      await famille.save();
    } else if (sexe === "F" && !famille.mereId) {
      famille.mereId = utilisateur.id;
      await famille.save();
    }

    res.status(201).json({
      message: "✅ Utilisateur créé avec succès",
      utilisateur,
    });
  } catch (error) {
    console.error("❌ Erreur registerUtilisateur:", error);
    res.status(500).json({
      message: "❌ Erreur lors de la création de l'utilisateur",
      error: error.message,
    });
  }
};



// ➡️ Marquer un utilisateur comme décédé
export const declarerDeces = async (req, res) => {
  try {
    const { date_deces } = req.body;
    const utilisateur = await Utilisateur.findOne({ id: req.params.id }); // 🔹 findOne avec id à 6 chiffres

    if (!utilisateur) {
      return res.status(404).json({ message: "Utilisateur introuvable ❌" });
    }

    // Mettre à jour l'utilisateur
    utilisateur.statut = "decede";
    utilisateur.date_deces = date_deces || new Date();
    await utilisateur.save();

    // Mettre à jour le statut dans la famille si c'est le père ou la mère
    const famille = await Famille.findOne({ id: utilisateur.familleId });
    if (famille) {
      if (famille.pereId === utilisateur.id) {
        famille.pereStatut = "decede";
      }
      if (famille.mereId === utilisateur.id) {
        famille.mereStatut = "decede";
      }
      await famille.save();
    }

    res.json({
      message: "Utilisateur marqué comme décédé ✅",
      utilisateur,
    });
  } catch (error) {
    console.error("❌ Erreur declarerDeces:", error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du décès ❌",
      error: error.message,
    });
  }
};


export const updateUtilisateur = async (req, res) => {
  try {
    console.log("🧩 [UPDATE] Requête reçue :", req.params.id);
    console.log("🧩 Body :", req.body);
    console.log("🧩 Fichier :", req.file ? req.file.filename : "Aucun");

    // 🔹 Mongoose : findOne avec l'ID personnalisé
    const utilisateur = await Utilisateur.findOne({ id: req.params.id });
    if (!utilisateur) {
      return res.status(404).json({ message: "❌ Utilisateur introuvable" });
    }

    // Champs du corps
    const {
      nom,
      postnom,
      prenom,
      lieu_naissance,
      date_naissance,
      sexe,
      niveau_etude,
      numero_tel,
      adresse,
      nationalite,
      etat_civil,
      profession,
    } = req.body;

    // Gestion date
    let isoDate = utilisateur.date_naissance;
    if (date_naissance && date_naissance.trim() !== "") {
      const parsed = moment(date_naissance, ["DD/MM/YYYY", "YYYY-MM-DD"], true);
      isoDate = parsed.isValid() ? parsed.toDate() : utilisateur.date_naissance;
    }

    // Gestion photo
    const photo = req.file ? req.file.filename : utilisateur.photo;

    // Mise à jour des champs
    utilisateur.nom = nom || utilisateur.nom;
    utilisateur.postnom = postnom || utilisateur.postnom;
    utilisateur.prenom = prenom || utilisateur.prenom;
    utilisateur.lieu_naissance = lieu_naissance || utilisateur.lieu_naissance;
    utilisateur.date_naissance = isoDate;
    utilisateur.sexe = sexe || utilisateur.sexe;
    utilisateur.niveau_etude = niveau_etude || utilisateur.niveau_etude;
    utilisateur.numero_tel = numero_tel || utilisateur.numero_tel;
    utilisateur.adresse = adresse || utilisateur.adresse;
    utilisateur.nationalite = nationalite || utilisateur.nationalite;
    utilisateur.etat_civil = etat_civil || utilisateur.etat_civil;
    utilisateur.profession = profession || utilisateur.profession;
    utilisateur.photo = photo;

    await utilisateur.save(); // 🔹 Enregistrer les changements

    console.log("✅ Utilisateur mis à jour avec succès :", utilisateur.id);
    return res.status(200).json({
      message: "✅ Utilisateur modifié avec succès",
      utilisateur,
    });
  } catch (error) {
    console.error("❌ Erreur updateUtilisateur :", error.stack);
    return res.status(500).json({
      message: "❌ Erreur lors de la modification",
      error: error.message,
    });
  }
};

export const deleteUtilisateur = async (req, res) => {
  try {
    // 🔹 Trouver l'utilisateur par son ID à 6 chiffres
    const utilisateur = await Utilisateur.findOne({ id: req.params.id });
    if (!utilisateur) {
      return res.status(404).json({ message: "❌ Utilisateur introuvable" });
    }

    // 🔹 Supprimer l'utilisateur
    await Utilisateur.deleteOne({ id: req.params.id });

    // 🔹 Mettre à jour le nombre de personnes dans la famille
    if (utilisateur.familleId) {
      const famille = await Famille.findOne({ id: utilisateur.familleId });
      if (famille) {
        const count = await Utilisateur.countDocuments({ familleId: famille.id });
        famille.nombre_personne = count;
        await famille.save();
      }
    }

    res.json({ message: "✅ Utilisateur supprimé avec succès" });
  } catch (error) {
    res.status(500).json({ message: "❌ Erreur lors de la suppression", error: error.message });
  }
};


// 📋 Récupérer utilisateurs selon rôle
export const getUtilisateurs = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Non autorisé ❌" });

    let filter = {};

    if (req.user.role === "admin") {
      filter = { adminId: req.user.id };
    } else if (req.user.role === "preadmin") {
      filter = { habitatId: req.user.habitatId };
    }else if (req.user.role ==="travailler"){
      filter = {
         habitatId: req.user.habitatId
        }
    } 
    else if (req.user.role === "superadmin") {
      filter = {}; // voir tous
    } else {
      return res.status(403).json({ message: "Accès refusé ❌" });
    }

    const utilisateurs = await Utilisateur.find(filter)
      .populate({ path: "famille", select: "id nom_complet" })   // utiliser le virtual
      .populate({ path: "admin", select: "id nom_complet" })     // virtual admin
      .populate({ path: "habitat", select: "id nom" })           // virtual habitat
      .sort({ createdAt: -1 })
      .lean();

    res.json(utilisateurs);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de la récupération des utilisateurs ❌",
      error: error.message,
    });
  }
};

// 📋 Récupérer les utilisateurs d'une famille spécifique
export const getUtilisateursByFamille = async (req, res) => {
  try {
    const { familleId } = req.params;

    if (!familleId) {
      return res.status(400).json({ message: "❌ ID de la famille manquant." });
    }

    // Vérifier que la famille existe
    const famille = await Famille.findOne({ id: familleId });
    if (!famille) {
      return res.status(404).json({ message: "❌ Famille introuvable." });
    }

    // Filtre de base
    let filter = { familleId };

    // Sécurité selon le rôle
    if (req.user.role === "travailleur") {
      filter.habitatId = req.user.habitatId; // il ne voit que les familles de son habitat
    } else if (req.user.role === "preadmin") {
      filter.habitatId = req.user.habitatId;
    } else if (req.user.role === "admin") {
      filter.adminId = req.user.id;
    } else if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "Accès refusé ❌" });
    }

    // Chercher les utilisateurs de la famille
    const utilisateurs = await Utilisateur.find(filter)
      .populate({ path: "famille", select: "id nom_complet" })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      famille: famille.nom_complet,
      total: utilisateurs.length,
      utilisateurs,
    });
  } catch (error) {
    console.error("❌ Erreur getUtilisateursByFamille:", error);
    res.status(500).json({
      message: "❌ Erreur lors du chargement des utilisateurs de la famille.",
      error: error.message,
    });
  }
};


