// middlewares/verifyToken.js
import jwt from "jsonwebtoken";


export const verifyToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  console.log("Authorization header:", authHeader);

  const token = authHeader?.split(" ")[1]; // format attendu: Bearer <token>
  
  if (!token) {
    console.log("❌ Aucun token trouvé");
    return res.status(401).json({ message: "⛔ Token manquant" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // on stocke { id, role } dans req
    console.log("✅ Token décodé:", decoded);

    next();
  } catch (err) {
    console.log("❌ Erreur de vérification du token:", err.message);
    return res.status(401).json({ message: "⛔ Token invalide" });
  }
};

// middlewares/verifyRole.js
export const verifyRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Accès refusé" });
    }
    next();
  };
};
