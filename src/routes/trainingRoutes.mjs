import express from "express";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { insert, query } from "../config/db.mjs";

const router = express.Router();

const normalizeImage = (value) => {
  const image = (value || "").trim();
  if (!image) return "";
  if (image.startsWith("/uploads/")) return image;
  if (image.startsWith("uploads/")) return `/${image}`;
  const uploadsIndex = image.indexOf("/uploads/");
  if (uploadsIndex >= 0) return image.slice(uploadsIndex);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(image)) {
    const match = image.match(/\/uploads\/.+$/i);
    if (match) return match[0];
  }
  return image;
};

const mapTraining = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  image: normalizeImage(row.image),
  description: row.description,
  category: row.category_label,
  duration: row.duration,
  priceTND: Number(row.price_tnd),
  priceEUR: Number(row.price_eur),
  availability: row.availability_json ? JSON.parse(row.availability_json) : []
});

router.get("/", async (_req, res) => {
  try {
    const trainings = await query("SELECT * FROM trainings ORDER BY price_tnd ASC, id DESC");
    res.json(trainings.map(mapTraining));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message || "Erreur lors du chargement des formations" });
  }
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  try {
    const { title, image, description, category, duration, priceTND, priceEUR, availability = [] } = req.body;
    const result = await insert(
      `INSERT INTO trainings (title, image, description, category_label, duration, price_tnd, price_eur, availability_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, normalizeImage(image), description, category || "Esthetique avancee", duration, Number(priceTND || 0), Number(priceEUR || 0), JSON.stringify(availability)]
    );
    const [training] = await query("SELECT * FROM trainings WHERE id = ?", [result.insertId]);
    res.status(201).json(mapTraining(training));
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de la creation de la formation" });
  }
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const { title, image, description, category, duration, priceTND, priceEUR, availability = [] } = req.body;
    const result = await insert(
      `UPDATE trainings
       SET title = ?, image = ?, description = ?, category_label = ?, duration = ?, price_tnd = ?, price_eur = ?, availability_json = ?
       WHERE id = ?`,
      [title, normalizeImage(image), description, category || "Esthetique avancee", duration, Number(priceTND || 0), Number(priceEUR || 0), JSON.stringify(availability), req.params.id]
    );
    if (!result.affectedRows) return res.status(404).json({ message: "Formation introuvable" });
    const [training] = await query("SELECT * FROM trainings WHERE id = ?", [req.params.id]);
    if (!training) return res.status(404).json({ message: "Formation introuvable" });
    res.json(mapTraining(training));
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de la modification de la formation" });
  }
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  try {
    const result = await insert("DELETE FROM trainings WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ message: "Formation introuvable" });
    res.json({ message: "Formation supprimee" });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de la suppression de la formation" });
  }
});

export default router;
