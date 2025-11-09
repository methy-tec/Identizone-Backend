import { PreAdmin, Admin, Habitat, Famille, Travailleur, Utilisateur } from "../models/index.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "moment";

// Récupérer le PreAdmin connecté
export const meConnect = async (req, res) => {
  try {
    // Chercher l'admin par ID à 6 chiffres et récupérer le habitat via virtual
    const preadmin = await PreAdmin.findOne({ id: req.user.id }).populate(
      {
        path:'habitatId',
        select:'nom id', //Champs a recuperer
        model:'Habitat',  //Model cibler
        match: {},  //Facultatif
        foreignField: 'id', //Champ "id" dans Habitat
        localField: 'habitatId', //Champ "habitatId" dans PreAdmin
    }
    );
    res.json(preadmin);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération profil ❌", error: err.message });
  }
};

// Mettre à jour profil
export const updateProfil = async (req, res) => {
  try {
    // Chercher l'admin par ID à 6 chiffres
    const preadmin = await PreAdmin.findOne({ id: req.user.id });
    if (!preadmin) return res.status(404).json({ message: "PreAdmin introuvable" });

    const { username, nom_complet, numero_tel, adresse } = req.body;
    preadmin.username = username || preadmin.username;
    preadmin.nom_complet = nom_complet || preadmin.nom_complet;
    preadmin.numero_tel = numero_tel || preadmin.numero_tel;
    preadmin.adresse = adresse || preadmin.adresse;

    if (req.file) preadmin.photo = req.file.filename;

    await preadmin.save();
    res.json({ message: "Profil mis à jour ✅", preadmin });
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour profil ❌", error: err.message });
  }
};

// Changer mot de passe
export const changePass = async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;

    // Chercher l'admin par ID custom à 6 chiffres
    const preadmin = await PreAdmin.findOne({ id: req.user.id });
    if (!preadmin) return res.status(404).json({ message: "PreAdmin introuvable" });

    // Vérifier le mot de passe actuel
    const valid = await bcrypt.compare(ancien, preadmin.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe actuel incorrect" });

    //Comparer ancien et nouveau mot de passe
    if (ancien === nouveau) return res.status(400).json({ message: "Nouveau mot de passe ne peut pas être identique à l'ancien ❌" });

    

    // Hash du nouveau mot de passe
    preadmin.password = await bcrypt.hash(nouveau, 10);
    await preadmin.save();

    res.json({ message: "Mot de passe mis à jour ✅" });
  } catch (err) {
    res.status(500).json({ message: "Erreur changement mot de passe", error: err.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await PreAdmin.findOne({ username });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe incorrect" });

    const token = jwt.sign(
      { id: user.id, role: user.role, nom_complet: user.nom_complet, username: user.username, adminId: user.adminId, habitatId: user.habitatId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, nom_complet: user.nom_complet, username: user.username, adminId: user.adminId, habitatId: user.habitatId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      refreshToken,
      user: { id: user.id, nom_complet: user.nom_complet, username: user.username, role: user.role, habitatId: user.habitatId }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Créer un PreAdmin
export const createPreAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Seul un Admin peut créer un PreAdmin ❌" });
    }

    const { username, nom_complet, lieu_naissance, date_naissance, numero_tel, adresse, password } = req.body;
    if (!username || !nom_complet || !lieu_naissance || !date_naissance || !numero_tel || !adresse || !password) {
      return res.status(400).json({ message: "Tous les champs obligatoires doivent être remplis ❌" });
    }

    //Verifie si l'admin existe deja
    const existingPreAdmin = await PreAdmin.findOne({ username });
    if (existingPreAdmin) return res.status(400).json({ message: "Nom d'utilisateur déjà pris ❌" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const photo = req.file ? req.file.filename : null;

    const isoDate = moment(date_naissance, ["YYYY-MM-DD", "DD/MM/YYYY"], true);
    if (!isoDate.isValid()) return res.status(400).json({ message: "Date de naissance invalide ❌" });

    const preAdmin = new PreAdmin({
      username,
      nom_complet,
      lieu_naissance,
      date_naissance: isoDate.format("YYYY-MM-DD"),
      numero_tel,
      adresse,
      password: hashedPassword,
      photo,
      adminId: req.user.id,
      habitatId: req.user.habitatId
    });
    await preAdmin.save();

    res.status(201).json({ message: "PreAdmin créé avec succès ✅", preAdmin });
  } catch (error) {
    res.status(500).json({ message: "Erreur lors de la création du PreAdmin ❌", error: error.message });
  }
};

// Obtenir tous les PreAdmins
export const getAllPreAdmins = async (req, res) => {
  try {
    let preAdmins;

    if (req.user.role === "superadmin") {
      preAdmins = await PreAdmin.find()
        .populate({
          path: 'adminId',
          model: 'Admin',
          localField: 'adminId',   // champ dans PreAdmin
          foreignField: 'id',      // champ id à 6 chiffres dans Admin
        })
        .populate({
          path: 'habitatId',
          model: 'Habitat',
          localField: 'habitatId',
          foreignField: 'id',      // champ id à 6 chiffres dans Habitat
        });
    } else if (req.user.role === "admin") {
      preAdmins = await PreAdmin.find({ adminId: req.user.id })
        .populate({
          path: 'adminId',
          model: 'Admin',
          localField: 'adminId',
          foreignField: 'id',
        })
        .populate({
          path: 'habitatId',
          model: 'Habitat',
          localField: 'habitatId',
          foreignField: 'id',
        });
    } else {
      return res.status(403).json({ message: "⛔ Accès interdit" });
    }

    res.json(preAdmins);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération PreAdmins ❌", error: error.message });
  }
};

// Obtenir un PreAdmin par ID
export const getPreAdminById = async (req, res) => {
  try {
    const preAdmin = await PreAdmin.findOne({ id: req.params.id }) // utiliser findOne sur ton ID à 6 chiffres
      .populate({
        path: 'adminId',
        model: 'Admin',
        localField: 'adminId',
        foreignField: 'id',
      })
      .populate({
        path: 'habitatId',
        model: 'Habitat',
        localField: 'habitatId',
        foreignField: 'id',
      });

    if (!preAdmin) return res.status(404).json({ message: "PreAdmin introuvable ❌" });

    // Vérification des permissions
    if (req.user.role === "superadmin" || (req.user.role === "admin" && preAdmin.adminId.id === req.user.id)) {
      return res.json(preAdmin);
    }

    return res.status(403).json({ message: "⛔ Accès interdit" });
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération PreAdmin ❌", error: error.message });
  }
};


export const updatePreAdmin = async (req, res) => {
  try {
    const { id } = req.params; // ID à 6 chiffres
    const { username, nom_complet, date_naissance, numero_tel, adresse, password } = req.body;

    // Utiliser findOne sur le champ id
    const preAdmin = await PreAdmin.findOne({ id })
      .populate({
        path: 'adminId',
        model: 'Admin',
        localField: 'adminId',
        foreignField: 'id',
      })
      .populate({
        path: 'habitatId',
        model: 'Habitat',
        localField: 'habitatId',
        foreignField: 'id',
      });

    if (!preAdmin) return res.status(404).json({ message: "PreAdmin introuvable ❌" });

    const isoDate = date_naissance ? moment(date_naissance, "YYYY-MM-DD").toDate() : preAdmin.date_naissance;
    const photo = req.file ? req.file.filename : preAdmin.photo;

    let hashedPassword = preAdmin.password;
    if (password && password.trim() !== "") hashedPassword = await bcrypt.hash(password, 10);

    preAdmin.username = username || preAdmin.username;
    preAdmin.nom_complet = nom_complet || preAdmin.nom_complet;
    preAdmin.date_naissance = isoDate;
    preAdmin.numero_tel = numero_tel || preAdmin.numero_tel;
    preAdmin.adresse = adresse || preAdmin.adresse;
    preAdmin.password = hashedPassword;
    preAdmin.photo = photo;

    await preAdmin.save();

    res.status(200).json({ message: "PreAdmin mis à jour ✅", preAdmin });
  } catch (error) {
    res.status(500).json({ message: "Erreur mise à jour PreAdmin ❌", error: error.message });
  }
};

// Supprimer un PreAdmin
export const deletePreAdmin = async (req, res) => {
  try {
    const { id } = req.params; // ID à 6 chiffres

    const preAdmin = await PreAdmin.findOne({ id });
    if (!preAdmin) return res.status(404).json({ message: "PreAdmin introuvable ❌" });

    await PreAdmin.deleteOne({ id });
    res.json({ message: "PreAdmin supprimé ✅" });
  } catch (error) {
    res.status(500).json({ message: "Erreur suppression PreAdmin ❌", error: error.message });
  }
};

// Rafraîchir token
export const refreshToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ message: "Token manquant ❌" });

  try {
    // Vérifier et décoder le refresh token
    const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);

    // Optionnel : vérifier que l'utilisateur existe toujours
    const user = await PreAdmin.findOne({ id: decoded.id });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable ❌" });

    // Générer un nouveau access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,            // ID à 6 chiffres
        role: user.role,
        habitatId: user.habitatId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token invalide ❌", error: err.message });
  }
};

