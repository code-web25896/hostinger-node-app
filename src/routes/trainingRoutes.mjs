import express from "express";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { insert, query } from "../config/db.mjs";

const router = express.Router();

const mapTraining = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  image: row.image,
  description: row.description,
  duration: row.duration,
  priceTND: Number(row.price_tnd),
  priceEUR: Number(row.price_eur),
  availability: row.availability_json ? JSON.parse(row.availability_json) : []
});

router.get("/", async (_req, res) => {
  const trainings = await query("SELECT * FROM trainings ORDER BY price_tnd ASC, id DESC");
  res.json(trainings.map(mapTraining));
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  const { title, image, description, duration, priceTND, priceEUR, availability = [] } = req.body;
  const result = await insert(
    `INSERT INTO trainings (title, image, description, duration, price_tnd, price_eur, availability_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [title, image, description, duration, Number(priceTND || 0), Number(priceEUR || 0), JSON.stringify(availability)]
  );
  const [training] = await query("SELECT * FROM trainings WHERE id = ?", [result.insertId]);
  res.status(201).json(mapTraining(training));
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  const { title, image, description, duration, priceTND, priceEUR, availability = [] } = req.body;
  await insert(
    `UPDATE trainings
     SET title = ?, image = ?, description = ?, duration = ?, price_tnd = ?, price_eur = ?, availability_json = ?
     WHERE id = ?`,
    [title, image, description, duration, Number(priceTND || 0), Number(priceEUR || 0), JSON.stringify(availability), req.params.id]
  );
  const [training] = await query("SELECT * FROM trainings WHERE id = ?", [req.params.id]);
  if (!training) return res.status(404).json({ message: "Formation introuvable" });
  res.json(mapTraining(training));
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  const result = await insert("DELETE FROM trainings WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Formation introuvable" });
  res.json({ message: "Formation supprimee" });
});

export default router;
