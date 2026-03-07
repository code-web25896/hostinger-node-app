import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ["admin", "student"], default: "student" },
    level: { type: String, default: "Debutant" },
    formationMode: { type: String, enum: ["En ligne", "Presentiel"], default: "Presentiel" }
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
