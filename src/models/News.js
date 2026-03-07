import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["Annonce", "Nouvelle formation", "Promotion", "Evenement"], required: true },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export default mongoose.model("News", newsSchema);
