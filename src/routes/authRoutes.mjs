import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { getUserWithPasswordByEmail, insert, query } from "../config/db.mjs";

const router = express.Router();

const tokenFor = (user) => jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = email ? await getUserWithPasswordByEmail(email) : null;

  if (!user) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  const token = tokenFor(user);
  res.json({ token, user: { id: user.id, fullName: user.fullName, role: user.role, email: user.email } });
});

router.post("/register-student", auth, requireRole("admin"), async (req, res) => {
  const { fullName, email, password, phone, level, formationMode, avatar } = req.body;

  const [exists] = await query("SELECT id FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
  if (exists) {
    return res.status(400).json({ message: "Email deja utilise" });
  }

  const hash = await bcrypt.hash(password || "123456", 10);
  const result = await insert(
    `INSERT INTO users (full_name, email, password_hash, phone, level_label, formation_mode, role, avatar_url)
     VALUES (?, ?, ?, ?, ?, ?, 'student', ?)`,
    [fullName, email.toLowerCase(), hash, phone || null, level || "Debutant", formationMode || "Presentiel", avatar || "/logo-academie.svg"]
  );

  await insert(
    `INSERT INTO student_records (student_id, avatar_url, progress_percent, hours_completed, total_hours, internship_label, certificate_status)
     VALUES (?, ?, 15, 3, 24, 'En attente', 'En cours d''acquisition')`,
    [result.insertId, avatar || "/logo-academie.svg"]
  );

  res.status(201).json({ id: result.insertId, _id: String(result.insertId), fullName, email: email.toLowerCase(), role: "student" });
});

router.get("/me", auth, async (req, res) => {
  res.json(req.user);
});

export default router;
