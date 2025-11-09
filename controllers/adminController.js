import { Admin, PreAdmin, Utilisateur, Famille, Travailleur, Habitat } from "../models/index.js"; 
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import moment from "moment";

// Récupérer l'admin connecté
export const meConnect = async (req, res) => {
  try {
    // Chercher l'admin par ID à 6 chiffres et récupérer le habitat via virtual
    const admin = await Admin.findOne({ id: req.user.id }).populate(
      {
        path:'habitatId',
        select:'nom id', //Champs a recuperer
        model:'Habitat',  //Model cibler
        match: {},  //Facultatif
        foreignField: 'id', //Champ "id" dans Habitat
        localField: 'habitatId', //Champ "habitatId" dans Admin
    }
    );
    res.json(admin);
  } catch (err) {
    res.status(500).json({ message: "Erreur récupération profil ❌", error: err.message });
  }
};


// Mettre à jour profil
export const updateProfil = async (req, res) => {
  try {
    // Chercher l'admin par ID à 6 chiffres
    const admin = await Admin.findOne({ id: req.user.id });
    if (!admin) return res.status(404).json({ message: "Admin introuvable" });

    const { username, nom_complet, numero_tel, adresse } = req.body;
    admin.username = username || admin.username;
    admin.nom_complet = nom_complet || admin.nom_complet;
    admin.numero_tel = numero_tel || admin.numero_tel;
    admin.adresse = adresse || admin.adresse;

    if (req.file) admin.photo = req.file.filename;

    await admin.save();
    res.json({ message: "Profil mis à jour ✅", admin });
  } catch (err) {
    res.status(500).json({ message: "Erreur mise à jour profil ❌", error: err.message });
  }
};


// Changer mot de passe
export const changePass = async (req, res) => {
  try {
    const { ancien, nouveau } = req.body;

    // Chercher l'admin par ID custom à 6 chiffres
    const admin = await Admin.findOne({ id: req.user.id });
    if (!admin) return res.status(404).json({ message: "Admin introuvable" });

    // Vérifier le mot de passe actuel
    const valid = await bcrypt.compare(ancien, admin.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe actuel incorrect" });

    // Hash du nouveau mot de passe
    admin.password = await bcrypt.hash(nouveau, 10);
    await admin.save();

    res.json({ message: "Mot de passe mis à jour ✅" });
  } catch (err) {
    res.status(500).json({ message: "Erreur changement mot de passe", error: err.message });
  }
};


// Créer un admin
export const register = async (req, res) => {
  try {
    const { username, nom_complet, lieu_naissance, date_naissance, numero_tel, adresse, camp, password } = req.body;
    
    // Vérifier si l'admin existe déjà
    const existingAdmin = await Admin.findOne({ username });
    if (existingAdmin) return res.status(400).json({ message: "Nom d'utilisateur déjà utilisé ❌" });
    
    const hashedPassword = await bcrypt.hash(password, 10);

    const photo = req.file ? req.file.filename : null;

    let isoDate = date_naissance;
    if (date_naissance.includes("/")) {
      isoDate = moment(date_naissance, "DD/MM/YYYY").format("YYYY-MM-DD");
    }

    const newAdmin = new Admin({
      username,
      nom_complet,
      lieu_naissance,
      camp,
      date_naissance: isoDate,
      numero_tel,
      adresse,
      photo,
      password: hashedPassword,
    });
    await newAdmin.save();

    const habitat = new Habitat({ nom: camp, adminId: newAdmin.id });
    await habitat.save();

    newAdmin.habitatId = habitat.id;
    await newAdmin.save();

    const token = jwt.sign(
      {id: newAdmin.id, role: newAdmin.role, nom_complet: newAdmin.nom_complet, username: newAdmin.username},
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    const refreshToken = jwt.sign(
      {id: newAdmin.id, role: newAdmin.role, nom_complet: newAdmin.nom_complet, username: newAdmin.username},
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json(
      { 
        message: "Admin et Habitat créés ✅", 
        token,
        refreshToken,
        newAdmin, 
        habitat,
      });
  } catch (error) {
    console.error("Erreur création admin:", error);
    res.status(500).json({ message: "Erreur lors de la création de l'admin ❌", error: error.message });
  }
};

// Connexion
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await Admin.findOne({ username });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable ❌" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe incorrect ❌" });

    const token = jwt.sign(
      { id: user.id, role: user.role, adminId: user.id, habitatId: user.habitatId },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, habitatId: user.habitatId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Connexion réussie ✅",
      token,
      refreshToken,
      user: { id: user.id, nom_complet: user.nom_complet, username: user.username, habitatId: user.habitatId, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Erreur interne lors de la connexion ❌", error: err.message });
  }
};

// Récupérer tous les admins
export const getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().populate(
      {
        path:'habitatId',
        select:'nom id', //Champs a recuperer
        model:'Habitat',  //Model cibler
        match: {},  //Facultatif
        foreignField: 'id', //Champ "id" dans Habitat
        localField: 'habitatId', //Champ "habitatId" dans Admin
    }
    );
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération admins ❌", error: error.message });
  }
};

// Récupérer un admin par ID
export const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    const admin = await Admin.findOne({id}).populate(
      {
        path:'habitatId',
        select:'nom id', //Champs a recuperer
        model:'Habitat',  //Model cibler
        match: {},  //Facultatif
        foreignField: 'id', //Champ "id" dans Habitat
        localField: 'habitatId', //Champ "habitatId" dans Admin
    }
    );

    if (!admin) return res.status(404).json({ message: "Admin introuvable ❌" });

    res.status(200).json(admin);
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération admin ❌", error: error.message });
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
    const user = await Admin.findOne({ id: decoded.id });
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

// Statistiques dynamiques selon l'admin connecté
export const getStatistics = async (req, res) => {
  try {
    const userId = req.user.id; // ID à 6 chiffres

    const preadmins = await PreAdmin.countDocuments({ adminId: userId });
    const familles = await Famille.countDocuments({ adminId: userId });
    const utilisateurs = await Utilisateur.countDocuments({ adminId: userId });
    const travailleurs = await Travailleur.countDocuments({ adminId: userId });

    res.json({ preadmins, familles, utilisateurs, travailleurs });
  } catch (error) {
    res.status(500).json({ message: "Erreur récupération statistiques ❌", error: error.message });
  }
};

// Mise d'admin
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("🧩 Requête de mise à jour admin :", id);

    // 🔍 Trouver l'admin via ton champ personnalisé "id" (pas _id MongoDB)
    const admin = await Admin.findOne({ id });
    if (!admin) {
      return res.status(404).json({ message: "❌ Admin introuvable" });
    }

    // Récupération des champs modifiables
    const { username, nom_complet, numero_tel, adresse, camp, lieu_naissance, date_naissance } = req.body;

    // Si une nouvelle photo est envoyée
    const photo = req.file ? req.file.filename : admin.photo;

    // Conversion de la date
    let isoDate = admin.date_naissance;
    if (date_naissance && date_naissance.trim() !== "") {
      isoDate = moment(date_naissance, ["DD/MM/YYYY", "YYYY-MM-DD"], true).isValid()
        ? moment(date_naissance, ["DD/MM/YYYY", "YYYY-MM-DD"]).format("YYYY-MM-DD")
        : admin.date_naissance;
    }

    // 🔄 Mise à jour des champs
    admin.username = username || admin.username;
    admin.nom_complet = nom_complet || admin.nom_complet;
    admin.numero_tel = numero_tel || admin.numero_tel;
    admin.adresse = adresse || admin.adresse;
    admin.camp = camp || admin.camp;
    admin.lieu_naissance = lieu_naissance || admin.lieu_naissance;
    admin.date_naissance = isoDate;
    admin.photo = photo;

    // Sauvegarde
    await admin.save();

    // Si le camp change → mettre à jour son habitat
    if (camp) {
      await Habitat.findOneAndUpdate({ adminId: admin.id }, { nom: camp });
    }

    res.status(200).json({
      message: "✅ Admin mis à jour avec succès",
      admin,
    });
  } catch (error) {
    console.error("❌ Erreur updateAdmin:", error);
    res.status(500).json({
      message: "❌ Erreur lors de la mise à jour de l'admin",
      error: error.message,
    });
  }
};
