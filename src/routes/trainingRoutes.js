import express from "express";
import Training from "../models/Training.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  const trainings = await Training.find().sort({ priceTND: 1 });
  res.json(trainings);
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  const training = await Training.create(req.body);
  res.status(201).json(training);
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  const updated = await Training.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) return res.status(404).json({ message: "Formation introuvable" });
  res.json(updated);
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  const deleted = await Training.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ message: "Formation introuvable" });
  res.json({ message: "Formation supprimee" });
});

export default router;
