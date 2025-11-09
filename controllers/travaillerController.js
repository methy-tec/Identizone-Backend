import moment from "moment";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Travailleur } from "../models/index.js";

// ➕ Créer un Travailleur
export const createTravailler = async (req, res) => {
  try {
    const { username, nom_complet, lieu_naissance, date_naissance, numero_tel, adresse, password } = req.body;
    
    let isoDate = null;
    if (date_naissance) {
      const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM-DD-YYYY"];
      const parsedDate = moment(date_naissance, formats, true);
      if (parsedDate.isValid()) isoDate = parsedDate.format("YYYY-MM-DD");
      else return res.status(400).json({ message: "Format de date invalide. Utilise YYYY-MM-DD ou DD/MM/YYYY." });
    }
    
    const exist = await Travailleur.findOne({ username });
    if (exist) return res.status(400).json({ message: "Nom d'utilisateur déjà utilisé ❌" });
    
    const photo = req.file ? req.file.filename : null;
    const hashedPassword = await bcrypt.hash(password, 10);

    const travailleur = new Travailleur({
      username,
      nom_complet,
      lieu_naissance,
      date_naissance: isoDate,
      numero_tel,
      adresse,
      password: hashedPassword,
      photo,
      preAdminId: req.user?.id || null,
      adminId: req.user?.adminId || null,
      habitatId: req.user?.habitatId || null,
    });

    await travailleur.save();
    
    res.status(201).json({ message: "Travailleur créé avec succès ✅", travailleur });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du Travailleur ❌", error: error.message });
  }
};


// 🔑 Login Travailleur
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await Travailleur.findOne({ username });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable ❌" });

    if (user.statut === "inactif") {
      return res.status(403).json({ message: "Votre session est désactivée. Contactez votre Admin ou PréAdmin." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe incorrect ❌" });

    const token = jwt.sign(
      { id: user.id, role: user.role, adminId: user.adminId, habitatId: user.habitatId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        nom_complet: user.nom_complet,
        username: user.username,
        role: user.role,
        habitatId: user.habitatId,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// 📋 Obtenir tous les Travailleurs
export const getAllTravaillers = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === "admin") filter.adminId = req.user.id;
    else if (req.user.role === "preadmin") filter.preAdminId = req.user.id;
    else if (req.user.role !== "superadmin") {
      return res.status(403).json({ message: "⛔ Accès interdit" });
    }

    const travailleurs = await Travailleur.find(filter).lean();
    res.json(travailleurs);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération Travailleurs ❌", error: error.message });
  }
};

// 🔎 Obtenir un Travailleur par ID
export const getTravaillerById = async (req, res) => {
  try {
    // Recherche par ton champ "id" à 6 chiffres
    const travailleur = await Travailleur.findOne({ id: req.params.id }).lean();
    if (!travailleur) {
      return res.status(404).json({ message: "Travailleur introuvable ❌" });
    }

    // Vérification des autorisations
    const authorized =
      req.user.role === "superadmin" ||
      (req.user.role === "admin" && travailleur.adminId?.toString() === req.user.id) ||
      (req.user.role === "preadmin" && travailleur.preAdminId?.toString() === req.user.id);

    if (!authorized) {
      return res.status(403).json({ message: "⛔ Accès interdit" });
    }

    // Nettoyage du résultat
    const result = { ...travailleur };
    delete result._id;
    delete result.__v;

    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Erreur récupération Travailleur ❌",
      error: error.message,
    });
  }
};


// ✏️ Modifier le statut d’un travailleur
export const updateStatut = async (req, res) => {
  try {
    const { id } = req.params; // <-- ton ID à 6 chiffres
    const { statut } = req.body;

    if (!["actif", "inactif"].includes(statut)) {
      return res.status(400).json({ message: "Statut invalide (actif/inactif)" });
    }

    // Recherche et mise à jour par champ "id"
    const travailleur = await Travailleur.findOneAndUpdate(
      { id },
      { statut },
      { new: true }
    ).lean();

    if (!travailleur) {
      return res.status(404).json({ message: "Travailleur introuvable ❌" });
    }

    res.json({
      message: `Travailleur ${statut} ✅`,
      travailleur,
    });
  } catch (err) {
    res.status(500).json({
      message: "Erreur lors de la mise à jour du statut ❌",
      error: err.message,
    });
  }
};


// 🗑️ Supprimer un Travailleur
export const deleteTravailler = async (req, res) => {
  try {
    // Recherche par ton champ "id" à 6 chiffres
    const travailleur = await Travailleur.findOne({ id: req.params.id });
    if (!travailleur) {
      return res.status(404).json({ message: "Travailleur introuvable ❌" });
    }

    await travailleur.deleteOne();
    res.json({ message: "Travailleur supprimé avec succès ✅" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression Travailleur ❌", error: error.message });
  }
};

// 🔄 Rafraîchir le token
export const refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "Token manquant ❌" });

  try {
    // Vérifier et décoder le refresh token
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // Rechercher l'utilisateur selon son rôle
    let user = null;
    switch (decoded.role) {
      case "travailleur":
        user = await Travailleur.findOne({ id: decoded.id });
        break;
      default:
        return res.status(400).json({ message: "Rôle inconnu ❌" });
    }

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable ❌" });
    }

    // Générer un nouveau access token
    const newAccessToken = jwt.sign(
      {
        id: user.id, // ID à 6 chiffres
        nom_complet: user.nom_complet,
        role: user.role,
        habitatId: user.habitatId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({
      message: "Refresh token invalide ❌",
      error: err.message,
    });
  }
};

// ✏️ Modifier un Travailleur
export const updateTravailler = async (req, res) => {
  try {
    const { id } = req.params; // ID à 6 chiffres du travailleur
    const travailleur = await Travailleur.findOne({ id });
    if (!travailleur) return res.status(404).json({ message: "Travailleur introuvable ❌" });

    // Vérification des autorisations
    const authorized =
      req.user.role === "superadmin" ||
      (req.user.role === "admin" && travailleur.adminId?.toString() === req.user.id) ||
      (req.user.role === "preadmin" && travailleur.preAdminId?.toString() === req.user.id);

    if (!authorized) return res.status(403).json({ message: "⛔ Accès interdit" });

    // Mettre à jour les champs texte
    const { username, nom_complet, lieu_naissance, date_naissance, numero_tel, adresse, password } = req.body;

    if (username) travailleur.username = username;
    if (nom_complet) travailleur.nom_complet = nom_complet;
    if (lieu_naissance) travailleur.lieu_naissance = lieu_naissance;
    if (numero_tel) travailleur.numero_tel = numero_tel;
    if (adresse) travailleur.adresse = adresse;

    // Date de naissance avec validation
    if (date_naissance) {
      const formats = ["YYYY-MM-DD", "DD/MM/YYYY", "MM-DD-YYYY"];
      const parsedDate = moment(date_naissance, formats, true);
      if (!parsedDate.isValid()) {
        return res.status(400).json({ message: "Format de date invalide. Utilise YYYY-MM-DD ou DD/MM/YYYY." });
      }
      travailleur.date_naissance = parsedDate.format("YYYY-MM-DD");
    }

    // Mot de passe (haché si fourni)
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      travailleur.password = hashedPassword;
    }

    // Photo (upload via multer)
    if (req.file) {
      travailleur.photo = req.file.filename;
    }

    await travailleur.save();

    // Nettoyage résultat
    const result = travailleur.toObject();
    delete result._id;
    delete result.__v;

    res.json({ message: "Travailleur mis à jour ✅", travailleur: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erreur mise à jour Travailleur ❌", error: error.message });
  }
};
