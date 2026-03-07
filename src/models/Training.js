import mongoose from "mongoose";

const trainingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    duration: { type: String, required: true },
    priceTND: { type: Number, required: true },
    availability: { type: [String], default: ["En ligne", "Presentiel"] }
  },
  { timestamps: true }
);

export default mongoose.model("Training", trainingSchema);
