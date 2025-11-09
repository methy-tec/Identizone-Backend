import mongoose from 'mongoose';

//Générateur d'ID unique à 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const preAdminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nom_complet: { type: String, required: true },
  lieu_naissance: {type: String, required: true},
  date_naissance: { type: Date },
  numero_tel: { type: String },
  adresse: { type: String },
  role: { type: String, default: 'preadmin' },
  photo: { type: String },

  // 🔗 Références
  adminId: { type: String, ref: 'Admin' },
  habitatId: { type: String, ref: 'Habitat' },
}, { timestamps: true });

// Middleware pour générer l'ID unique avant la sauvegarde
preAdminSchema.pre('validate', async function(next) {
  if (!this.id) {
    let newId;
    let exists = true;

    while (exists) {
      newId = generateSixDigitId();
      exists = await mongoose.model('PreAdmin').exists({ id: newId });
    }
    this.id = newId;
  }
  next();
});

//Cacher le champ _id et _v dans les responses JSON
preAdminSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});



export default mongoose.models.PreAdmin || mongoose.model('PreAdmin', preAdminSchema);
