import mongoose from 'mongoose';

//Générer un ID unique de 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const familleSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nom_complet: { type: String, required: true, unique: true },
  nombre_personne: { type: Number, default: 0 },
  pereStatut: { type: String, enum: ['vivant', 'decede'], default: 'vivant' },
  mereStatut: { type: String, enum: ['vivant', 'decede'], default: 'vivant' },
  date_deces_pere: { type: Date },
  date_deces_mere: { type: Date },

  // 🔗 Références
  adminId: { type: String, ref: 'Admin' },
  habitatId: { type: String, ref: 'Habitat' },
  pereId: { type: String, ref: 'Utilisateur' },
  mereId: { type: String, ref: 'Utilisateur' },
}, { timestamps: true });

// Virtuals pour populate père et mère
familleSchema.virtual('pere', {
  ref: 'Utilisateur',
  localField: 'pereId',
  foreignField: 'id',  // correspond à l'ID à 6 chiffres dans Utilisateur
  justOne: true,
});

familleSchema.virtual('mere', {
  ref: 'Utilisateur',
  localField: 'mereId',
  foreignField: 'id',
  justOne: true,
});

// Inclure les virtuals dans les JSON
familleSchema.set('toJSON', { virtuals: true });
familleSchema.set('toObject', { virtuals: true });

//Middleware avant de création pour générer un ID unique
familleSchema.pre("validate", async function (next) {
  if (!this.id) {
    let newId;
    let exists = true;

    while (exists) {
      newId = generateSixDigitId();
      exists = await mongoose.model('Famille').exists({ id: newId });
    }

    this.id = newId;
  }
  next();
});

//Cacher le champ _id et  _v dans les reponses JSON
familleSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});

export default mongoose.models.Famille || mongoose.model('Famille', familleSchema);
