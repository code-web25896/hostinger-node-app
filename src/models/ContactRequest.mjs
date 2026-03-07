import mongoose from "mongoose";

const contactRequestSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, default: "" },
    message: { type: String, required: true },
    status: { type: String, enum: ["Nouveau", "Traite"], default: "Nouveau" }
  },
  { timestamps: true }
);

export default mongoose.model("ContactRequest", contactRequestSchema);

