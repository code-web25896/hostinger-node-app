import express from "express";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { getStudentRecordBundle, insert, query } from "../config/db.mjs";

const router = express.Router();

router.get("/dashboard", auth, requireRole("student"), async (req, res) => {
  const record = await getStudentRecordBundle(req.user.id);

  if (!record) {
    return res.status(404).json({ message: "Dossier etudiant non configure" });
  }

  const averageScore = record.notes.length
    ? Math.round(record.notes.reduce((sum, note) => sum + (note.score || 0), 0) / record.notes.length)
    : 0;

  res.json({
    ...record,
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

  const [record] = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [req.user.id]);
  if (!record) {
    return res.status(404).json({ message: "Dossier etudiant non configure" });
  }

  await insert(
    `INSERT INTO student_messages (student_record_id, subject, message)
     VALUES (?, ?, ?)`,
    [record.id, subject || "Message eleve", message]
  );

  const updatedRecord = await getStudentRecordBundle(req.user.id);
  res.status(201).json({ message: "Message envoye a l'administration.", record: updatedRecord });
});

export default router;
