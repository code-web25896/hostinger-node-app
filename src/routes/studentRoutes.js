import express from "express";
import StudentRecord from "../models/StudentRecord.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = express.Router();

router.get("/dashboard", auth, requireRole("student"), async (req, res) => {
  const record = await StudentRecord.findOne({ student: req.user._id })
    .populate("student", "fullName email phone level formationMode")
    .populate("formation", "title duration priceTND image");

  if (!record) {
    return res.status(404).json({ message: "Dossier etudiant non configure" });
  }

  const averageScore = record.notes.length
    ? Math.round(record.notes.reduce((sum, note) => sum + (note.score || 0), 0) / record.notes.length)
    : 0;

  res.json({
    ...record.toObject(),
    averageScore,
    latestNotes: [...record.notes].slice(-3).reverse(),
    latestMessages: [...record.hrMessages].slice(-3).reverse(),
    latestStudentMessages: [...record.studentMessages].slice(-3).reverse()
  });
});

router.post("/messages", auth, requireRole("student"), async (req, res) => {
  const { subject, message } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ message: "Le message est obligatoire" });
  }

  const record = await StudentRecord.findOneAndUpdate(
    { student: req.user._id },
    { $push: { studentMessages: { subject: subject || "Message eleve", message } } },
    { new: true, upsert: true }
  );

  res.status(201).json({ message: "Message envoye au service RH.", record });
});

export default router;
