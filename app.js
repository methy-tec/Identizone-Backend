// src/server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import { connectMongo } from "./config/database.js"; // ✅ Ton fichier MongoDB
import { auditMiddleware } from "./middlewares/auditMiddleware.js"; // Mon fichier pour enregistre chaque action

// Charger les variables d'environnement
dotenv.config();

const app = express();

// ----------------------------
// 🔐 1️⃣ Sécurité générale
// ----------------------------
app.use(helmet()); // protège les headers HTTP
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  next();
});// empêche les injections MongoDB
app.use(xssClean()); // bloque les attaques XSS
app.use(hpp()); // empêche la pollution des paramètres HTTP
app.use(compression()); // compresse les réponses pour de meilleures performances

// ----------------------------
// 🌍 2️⃣ CORS (Accès API sécurisé)
// ----------------------------
app.use(
  cors({
    origin: process.env.FRONT_URL || "*", // 👉 à remplacer plus tard par ton URL front Electron ou web
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ----------------------------
// 🧠 3️⃣ Body Parser
// ----------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ----------------------------
// 📂 4️⃣ Dossier statique (uploads, images, empreintes, etc.)
// ----------------------------
app.use("/uploads", express.static("identizone"));
app.disable("x-powered-by"); // masque le header Express

//📂 AJout du middleware global d'audit
app.use(auditMiddleware);

// ----------------------------
// 📊 5️⃣ Logs
// ----------------------------
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev")); // format lisible en dev
} else {
  app.use(morgan("combined")); // format log complet en prod
}

// ----------------------------
// 🚦 6️⃣ Limiteur de requêtes
// ----------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500, // max requêtes / IP
  message: "⛔ Trop de requêtes, réessayez plus tard.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ----------------------------
// 🔗 7️⃣ Importation des routes
// ----------------------------
import superAdminRoutes from "./routes/superAdminRoutes.js";
import adminRoutes from "./routes/adminRoute.js";
import preAdminRoutes from "./routes/preAdminRoute.js";
import travailleurRoutes from "./routes/travailleurRoutes.js";
import familleRoutes from "./routes/familleRoutes.js";
import utilisateurRoutes from "./routes/utilisateurRoute.js";

// ----------------------------
// 🧭 8️⃣ Définition des routes API
// ----------------------------
app.use("/api/super", superAdminRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/preadmin", preAdminRoutes);
app.use("/api/travailler", travailleurRoutes);
app.use("/api/familles", familleRoutes);
app.use("/api/users", utilisateurRoutes);

// ----------------------------
// 🩺 9️⃣ Route test / santé du serveur
// ----------------------------
app.get("/", (req, res) => {
  res.status(200).json({
    status: "✅ OK",
    message: "Bienvenue sur IdentiZone API sécurisée !",
    time: new Date(),
  });
});

// ----------------------------
// 🚀 🔟 Connexion DB + lancement serveur
// ----------------------------
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectMongo();
    app.listen(PORT, () =>
      console.log(`🚀 Serveur lancé et sécurisé sur http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Erreur de connexion à MongoDB :", error.message);
    process.exit(1);
  }
};

startServer();
