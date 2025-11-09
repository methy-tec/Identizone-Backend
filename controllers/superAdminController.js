import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { SuperAdmin, Admin, PreAdmin, Utilisateur, Famille, Habitat, Travailleur } from "../models/index.js"; // chemins MongoDB

// Enregistrer un super admin
export const register = async (req, res) => {
  try {
    const { username, nom_complet, numero_tel, adresse, password } = req.body;

    const existingUser = await SuperAdmin.findOne({ username });
    if (existingUser) return res.status(400).json({ message: "Nom d'utilisateur déjà utilisé ❌" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new SuperAdmin({
      username,
      nom_complet,
      numero_tel,
      adresse,
      password: hashedPassword,
    });

    const token = jwt.sign(
      {id: newUser.id, role: newUser.role, nom_complet: newUser.nom_complet, username: newUser.username},
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    )

    const refreshToken = jwt.sign(
      {id: newUser.id, role: newUser.role, nom_complet: newUser.nom_complet, username: newUser.username},
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    )

    await newUser.save();
    res.status(201).json({
      message: "Super Admin enregistré avec succès ✅",
      token,
      refreshToken,
      user: {
        id: newUser.id,
        nom_complet: newUser.nom_complet,
        username: newUser.username,
        role: newUser.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Connexion
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await SuperAdmin.findOne({ username });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable ❌" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe incorrect ❌" });

    // Utiliser l'ID custom à 6 chiffres
    const token = jwt.sign(
      { id: user.id, role: user.role, nom_complet: user.nom_complet, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id, role: user.role, nom_complet: user.nom_complet, username: user.username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      token,
      refreshToken,
      user: { id: user.id, nom_complet: user.nom_complet, username: user.username, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    const user = await SuperAdmin.findOne({ id: decoded.id });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable ❌" });

    // Générer un nouveau access token
    const newAccessToken = jwt.sign(
      {
        id: user.id,            // ID à 6 chiffres
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token invalide ❌", error: err.message });
  }
};

// Statistiques
export const getStatistics = async (req, res) => {
  try {
    const [superadmins, admins, preadmins, familles, utilisateurs, travailleurs, habitats] = await Promise.all([
      SuperAdmin.countDocuments(),
      Admin.countDocuments(),
      PreAdmin.countDocuments(),
      Famille.countDocuments(),
      Utilisateur.countDocuments(),
      Travailleur.countDocuments(),
      Habitat.countDocuments(),
    ]);

    res.json({ superadmins, admins, preadmins, familles, utilisateurs, travailleurs, habitats });
  } catch (error) {
    console.error("Erreur statistiques:", error);
    res.status(500).json({ message: "Erreur récupération statistiques ❌", error: error.message });
  }
};
