// src/server.js
import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import xssClean from "xss-clean";
import hpp from "hpp";
import compression from "compression";
import { connectMongo } from "./config/database.js";
import { auditMiddleware } from "./middlewares/auditMiddleware.js";

dotenv.config();

const app = express();

// ----------------------------
// 🔐 1️⃣ Sécurité générale
// ----------------------------
app.use(helmet());
app.use((req, res, next) => {
  if (req.body) mongoSanitize.sanitize(req.body, { replaceWith: "_" });
  if (req.params) mongoSanitize.sanitize(req.params, { replaceWith: "_" });
  next();
});
app.use((req, res, next) => {
  const sanitizeObject = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = xssClean(obj[key]);
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitizeObject(obj[key]);
      }
    }
  };
  if (req.body) sanitizeObject(req.body);
  if (req.params) sanitizeObject(req.params);
  next();
});
app.use(hpp());
app.use(compression());

// ----------------------------
// 🌍 2️⃣ CORS dynamique pour plusieurs origines
// ----------------------------
const allowedOrigins = process.env.FRONT_URL ? process.env.FRONT_URL.split(",").concat("null"): ["*", "null"];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// ----------------------------
// 🧠 3️⃣ Body Parser
// ----------------------------
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// ----------------------------
// 📂 4️⃣ Dossier statique
// ----------------------------
app.use("/uploads", express.static("identizone"));
app.disable("x-powered-by");

// ----------------------------
//📂 Middleware audit
// ----------------------------
app.use(auditMiddleware);

// ----------------------------
// 📊 5️⃣ Logs
// ----------------------------
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// ----------------------------
// 🚦 6️⃣ Limiteur de requêtes
// ----------------------------
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
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
