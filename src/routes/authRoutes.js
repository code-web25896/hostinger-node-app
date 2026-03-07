import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import StudentRecord from "../models/StudentRecord.js";
import { auth } from "../middleware/auth.js";
import { requireRole } from "../middleware/role.js";

const router = express.Router();

const tokenFor = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase() });

  if (!user) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  const token = tokenFor(user);
  res.json({ token, user: { id: user._id, fullName: user.fullName, role: user.role, email: user.email } });
});

router.post("/register-student", auth, requireRole("admin"), async (req, res) => {
  const { fullName, email, password, phone, level, formationMode, avatar } = req.body;

  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) {
    return res.status(400).json({ message: "Email deja utilise" });
  }

  const hash = await bcrypt.hash(password || "123456", 10);
  const student = await User.create({
    fullName,
    email: email.toLowerCase(),
    password: hash,
    phone,
    level: level || "Debutant",
    formationMode: formationMode || "Presentiel",
    role: "student"
  });

  await StudentRecord.create({
    student: student._id,
    avatar: avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80",
    progressPercent: 15,
    hoursCompleted: 3,
    totalHours: 24,
    internship: "En attente",
    documents: [
      {
        name: "Guide_Accueil.pdf",
        size: "1.8 MB",
        fileType: "PDF",
        url: "#"
      }
    ]
  });

  res.status(201).json({ id: student._id, fullName: student.fullName, email: student.email, role: student.role });
});

router.get("/me", auth, async (req, res) => {
  res.json(req.user);
});

export default router;
