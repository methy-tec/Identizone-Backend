import mongoose from 'mongoose';

// Générateur d'ID unique à 6 chiffres
function generateSixDigitId() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

const habitatSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  nom: { type: String, required: true },
  adminId: { type: String, ref: 'Admin' }, // <--- utiliser String pour id à 6 chiffres
}, { timestamps: true });

// Middleware pour générer l'ID unique avant la sauvegarde
habitatSchema.pre('validate', async function(next) {
  if (!this.id) {
    let newId;
    let exists = true;
    while (exists) {
      newId = generateSixDigitId();
      exists = await mongoose.models.Habitat.exists({ id: newId });
    }
    this.id = newId;
  }
  next();
});

// Cacher _id et __v dans les réponses JSON
habitatSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export default mongoose.models.Habitat || mongoose.model('Habitat', habitatSchema);