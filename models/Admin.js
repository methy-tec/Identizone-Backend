import mongoose from 'mongoose';

//Générer un ID unique de 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const adminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'admin' },
  nom_complet: { type: String, required: true },
  lieu_naissance: { type: String },
  date_naissance: { type: Date },
  numero_tel: { type: String, required: true },
  adresse: { type: String, required: true },
  photo: { type: String },
  camp: { type: String, required: true },

  // Relations
  superAdminId: { type: mongoose.Schema.Types.ObjectId, ref: 'SuperAdmin' },
  habitatId: { type: String, ref: 'Habitat' },

}, { timestamps: true });

//Middleware avant de création pour générer un ID unique
adminSchema.pre("validate", async function (next) {
  if (!this.id) {
    let newId;
    let exists = true;

    while (exists) {
      newId = generateSixDigitId();
      exists = await mongoose.model('Admin').exists({ id: newId });
    }

    this.id = newId;
  }
  next();
});

//Cacher le champ _id et  _v dans les reponses JSON
adminSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
  }
});


export default mongoose.models.Admin || mongoose.model('Admin', adminSchema);
