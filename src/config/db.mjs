import mongoose from "mongoose";

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/beauty_center";

  try {
    await mongoose.connect(uri);
    console.log(`MongoDB connecte: ${uri}`);
  } catch (error) {
    console.error("Erreur MongoDB:", error.message);
    process.exit(1);
  }
};

