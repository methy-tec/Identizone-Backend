import mongoose from 'mongoose';

//Générateur d'ID unique à 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const superAdminSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  nom_complet: { type: String, required: true },
  adresse: { type: String },
  numero_tel: { type: String },
  role: { type: String, default: 'superadmin' },
}, { 
  timestamps: true 
});

//Middleware avant de création pour générer un ID unique
superAdminSchema.pre('validate', async function (next) {
  if (!this.id) {
    let newId;
    let exists = true;

    while (exists) {
      newId = generateSixDigitId();
      exists = await mongoose.models.SuperAdmin.exists({ id: newId });
    }
    this.id = newId;
  }
  next();
});

//Cacher le champ _id et  _v dans les reponses JSON
superAdminSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
  }
});


export default mongoose.models.SuperAdmin || mongoose.model('SuperAdmin', superAdminSchema);
