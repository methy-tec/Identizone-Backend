import mongoose from 'mongoose';

//Générer un ID unique de 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const utilisateurSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nom: { type: String, required: true },
  postnom: { type: String, required: true },
  prenom: { type: String, required: true },
  lieu_naissance: { type: String },
  sexe: { type: String, enum: ['M', 'F'], default: 'M' },
  date_naissance: { type: Date },
  nationalite: { type: String },
  profession: { type: String },
  adresse: { type: String },
  etat_civil: { type: String },
  profession: { type: String },
  niveau_etude: { type: String },
  date_deces: {type: Date},
  numero_tel: { type: String },
  photo: {type: String},

  // 🔗 Références
  familleId: { type: String, ref: 'Famille' },
  adminId: { type: String, ref: 'Admin' },
  habitatId: { type: String, ref: 'Habitat' },
}, { timestamps: true });

// 🧩 Middleware pour mise à jour automatique du nombre de personnes dans la famille
utilisateurSchema.post('save', async function (doc) {
  if (doc.familleId) {
    const count = await mongoose.model('Utilisateur').countDocuments({ familleId: doc.familleId });
    // NE PAS utiliser findByIdAndUpdate, car familleId est une string personnalisée, pas un ObjectId
    await mongoose.model('Famille').findOneAndUpdate({ id: doc.familleId }, { nombre_personne: count });
  }
});


utilisateurSchema.post('remove', async function (doc) {
  if (doc.familleId) {
    const count = await mongoose.model('Utilisateur').countDocuments({ familleId: doc.familleId });
    await mongoose.model('Famille').findByIdAndUpdate({ id: doc.familleId}, { nombre_personne: count });
  }
});

//Middleware avant de création pour générer un ID unique
utilisateurSchema.pre("validate", async function (next) {
  if (!this.id) {
    let newId;
    let exists = true;

    while (exists) {
      newId = generateSixDigitId();
      exists = await mongoose.model('Utilisateur').exists({ id: newId });
    }

    this.id = newId;
  }
  next();
});

//Cacher le champp _id et  _v dans les reponses JSON
utilisateurSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});
// Virtual pour la famille
utilisateurSchema.virtual('famille', {
  ref: 'Famille',
  localField: 'familleId', // champ dans Utilisateur
  foreignField: 'id',       // champ dans Famille
  justOne: true
});

// Virtual pour l'admin
utilisateurSchema.virtual('admin', {
  ref: 'Admin',
  localField: 'adminId',
  foreignField: 'id',
  justOne: true
});

// Virtual pour l'habitat
utilisateurSchema.virtual('habitat', {
  ref: 'Habitat',
  localField: 'habitatId',
  foreignField: 'id',
  justOne: true
});

// Inclure les virtuals dans JSON et Object
utilisateurSchema.set('toJSON', { virtuals: true });
utilisateurSchema.set('toObject', { virtuals: true });


export default mongoose.models.Utilisateur || mongoose.model('Utilisateur', utilisateurSchema);
