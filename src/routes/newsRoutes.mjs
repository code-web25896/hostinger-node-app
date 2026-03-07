import express from "express";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { insert, query } from "../config/db.mjs";

const router = express.Router();

const mapNews = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  content: row.content,
  type: row.type,
  createdAt: row.created_at,
  publishedBy: row.published_by
    ? { _id: String(row.published_by), fullName: row.publisher_name }
    : null
});

router.get("/", async (_req, res) => {
  const posts = await query(
    `SELECT n.*, u.full_name AS publisher_name
     FROM news n
     LEFT JOIN users u ON u.id = n.published_by
     ORDER BY n.created_at DESC`
  );
  res.json(posts.map(mapNews));
});

router.post("/", auth, requireRole("admin"), async (req, res) => {
  const { title, content, type } = req.body;
  const result = await insert(
    "INSERT INTO news (title, content, type, published_by) VALUES (?, ?, ?, ?)",
    [title, content, type || "Annonce", req.user.id]
  );
  const [post] = await query(
    `SELECT n.*, u.full_name AS publisher_name
     FROM news n
     LEFT JOIN users u ON u.id = n.published_by
     WHERE n.id = ?`,
    [result.insertId]
  );
  res.status(201).json(mapNews(post));
});

router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  const { title, content, type } = req.body;
  const result = await insert("UPDATE news SET title = ?, content = ?, type = ? WHERE id = ?", [title, content, type, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Actualite introuvable" });
  const [updated] = await query(
    `SELECT n.*, u.full_name AS publisher_name
     FROM news n
     LEFT JOIN users u ON u.id = n.published_by
     WHERE n.id = ?`,
    [req.params.id]
  );
  res.json(mapNews(updated));
});

router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  const result = await insert("DELETE FROM news WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Actualite introuvable" });
  res.json({ message: "Actualite supprimee" });
});

export default router;
