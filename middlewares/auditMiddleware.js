// src/middlewares/auditMiddleware.js
import fs from "fs";
import path from "path";
import winston from "winston";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

// 📁 Dossier de logs
const logsDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

// 🎯 Winston Logger
const auditLogger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()} - ${message}`;
    })
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, "audit.log"),
      maxsize: 5_000_000, // 5 MB max par fichier
      maxFiles: 5,
    }),
  ],
});

// 🧠 Middleware d’audit global
export const auditMiddleware = (req, res, next) => {
  // On garde le log uniquement pour les actions critiques
  const methodsToLog = ["POST", "PUT", "PATCH", "DELETE"];
  if (!methodsToLog.includes(req.method) && !req.path.includes("/login")) {
    return next();
  }

  let userInfo = "Utilisateur non authentifié";
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      userInfo = `${decoded.username || decoded.id || "inconnu"} (${decoded.role || "no-role"})`;
    }
  } catch {
    // utilisateur non authentifié
  }

  // On garde le corps et la requête
  const logData = {
    user: userInfo,
    method: req.method,
    route: req.originalUrl,
    ip: req.ip,
    body: req.body,
  };

  const message = `${logData.user} a effectué ${logData.method} sur ${logData.route} depuis ${logData.ip} | Body: ${JSON.stringify(logData.body)}`;

  auditLogger.info(message);

  next();
};
