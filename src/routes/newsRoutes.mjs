import express from "express";
import News from "../models/News\.mjs";
import { auth } from "../middleware/auth\.mjs";
import { requireRole } from "../middleware/role\.mjs";

const router = express.Router();

router.get("/", async (_req, res) => {
  const posts = await News.find().populate("publishedBy", "fullName").sort({ createdAt: -1 });
  res.json(posts);
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  const post = await News.create({ ...req.body, publishedBy: req.user._id });
  res.status(201).json(post);
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  const updated = await News.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Actualite introuvable" });
  res.json(updated);
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  const deleted = await News.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Actualite introuvable" });
  res.json({ message: "Actualite supprimee" });
});

export default router;

