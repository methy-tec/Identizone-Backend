import mongoose from 'mongoose';

// Générateur d'ID unique à 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const travailleurSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nom_complet: { type: String, required: true },
  lieu_naissance: { type: String },
  date_naissance: { type: Date },
  numero_tel: { type: String },
  adresse: { type: String },
  statut: { type: String, default: 'inactif' }, // actif ou inactif
  photo: { type: String },

  role: { type: String, default: 'travailleur' },

  // 🔗 Références
  adminId: { type: String, ref: 'Admin' },
  preAdminId: { type: String, ref: 'PreAdmin' },
  habitatId: { type: String, ref: 'Habitat' },
}, { timestamps: true });

// Middleware pour générer l'ID unique avant la sauvegarde
travailleurSchema.pre('validate', async function (next) {
  if (!this.id) {
    let newId;
    let exists = true;

    while (exists) {
      newId = generateSixDigitId();
      // ✅ Correction ici :
      exists = await mongoose.model('Travailleur').exists({ id: newId });
    }

    this.id = newId;
  }
  next();
});

// Cacher le champ _id et __v dans les réponses JSON
travailleurSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});

export default mongoose.models.Travailleur || mongoose.model('Travailleur', travailleurSchema);
