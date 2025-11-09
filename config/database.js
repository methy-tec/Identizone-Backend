import mongoose, { mongo } from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectMongo = async () => {
  try{
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅MongoDB connecté avec succés")
  } catch (error) {
    console.log("❌Erreur de connection à MongoDB:", error.message);
    process.exit(1);
  }
};