import express from "express";
import { insert, query } from "../config/db.mjs";

const router = express.Router();

const mapTraining = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  image: row.image,
  description: row.description,
  duration: row.duration,
  priceTND: Number(row.price_tnd)
});

const mapNews = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  content: row.content,
  type: row.type,
  createdAt: row.created_at
});

router.get("/search", async (req, res) => {
  const keyword = (req.query.q || "").trim();

  if (!keyword) {
    return res.json({ trainings: [], news: [] });
  }

  const like = `%${keyword}%`;
  const [trainings, news] = await Promise.all([
    query(
      `SELECT * FROM trainings WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC`,
      [like, like]
    ),
    query(
      `SELECT * FROM news WHERE title LIKE ? OR content LIKE ? OR type LIKE ? ORDER BY created_at DESC`,
      [like, like, like]
    )
  ]);

  res.json({ trainings: trainings.map(mapTraining), news: news.map(mapNews) });
});

router.get("/enrollments/status", async (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();
  const phone = (req.query.phone || "").trim();

  if (!email || !phone) {
    return res.status(400).json({ message: "Email et numero obligatoires" });
  }

  const enrollments = await query(
    `SELECT er.*, t.title AS training_title, t.price_tnd AS training_price_tnd
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     WHERE er.email = ? AND er.phone = ?
     ORDER BY er.created_at DESC`,
    [email, phone]
  );

  res.json(
    enrollments.map((item) => ({
      id: item.id,
      _id: String(item.id),
      fullName: item.full_name,
      phone: item.phone,
      email: item.email,
      mode: item.mode_label,
      notes: item.notes,
      status: item.status,
      training: {
        _id: String(item.training_id),
        title: item.training_title,
        priceTND: Number(item.training_price_tnd)
      }
    }))
  );
});

router.post("/contact", async (req, res) => {
  const { fullName, phone, email, message } = req.body;
  const result = await insert(
    `INSERT INTO contact_requests (full_name, phone, email, message, status)
     VALUES (?, ?, ?, ?, 'Nouveau')`,
    [fullName, phone, email || null, message]
  );
  const [contact] = await query("SELECT * FROM contact_requests WHERE id = ?", [result.insertId]);
  res.status(201).json({
    message: "Votre message a ete envoye.",
    contact: {
      _id: String(contact.id),
      fullName: contact.full_name,
      phone: contact.phone,
      email: contact.email,
      message: contact.message,
      status: contact.status
    }
  });
});

router.post("/enrollments", async (req, res) => {
  const { fullName, phone, email, mode, trainingId, notes } = req.body;
  const [training] = await query("SELECT id, title, price_tnd FROM trainings WHERE id = ?", [trainingId]);
  if (!training) {
    return res.status(404).json({ message: "Formation introuvable" });
  }

  const result = await insert(
    `INSERT INTO enrollment_requests (full_name, phone, email, mode_label, training_id, notes, status)
     VALUES (?, ?, ?, ?, ?, ?, 'En attente')`,
    [fullName, phone, email.toLowerCase(), mode || "Presentiel", trainingId, notes || ""]
  );

  res.status(201).json({
    message: "Demande d'inscription envoyee.",
    enrollment: {
      _id: String(result.insertId),
      fullName,
      phone,
      email: email.toLowerCase(),
      mode: mode || "Presentiel",
      notes: notes || "",
      status: "En attente",
      training: { _id: String(training.id), title: training.title, priceTND: Number(training.price_tnd) }
    }
  });
});

export default router;
