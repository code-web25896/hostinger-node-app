import mongoose from "mongoose";

const enrollmentRequestSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    mode: { type: String, enum: ["En ligne", "Presentiel"], required: true },
    training: { type: mongoose.Schema.Types.ObjectId, ref: "Training", required: true },
    notes: { type: String, default: "" },
    status: { type: String, enum: ["En attente", "Confirmee", "Refusee"], default: "En attente" }
  },
  { timestamps: true }
);

export default mongoose.model("EnrollmentRequest", enrollmentRequestSchema);

