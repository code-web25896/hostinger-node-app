import express from "express";
import path from "path";
import bcrypt from "bcryptjs";
import { insert, query } from "../config/db.mjs";
import { paymentAmountForTraining, serializeEnrollment } from "../lib/enrollmentUtils.mjs";
import { upload } from "../middleware/upload.mjs";

const router = express.Router();

const mapTraining = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  image: row.image,
  description: row.description,
  duration: row.duration,
  priceTND: Number(row.price_tnd),
  priceEUR: Number(row.price_eur)
});

const mapNews = (row) => ({
  id: row.id,
  _id: String(row.id),
  title: row.title,
  content: row.content,
  type: row.type,
  createdAt: row.created_at
});

const trainingFromRow = (row) => ({
  id: row.training_id,
  title: row.training_title,
  price_tnd: row.training_price_tnd,
  price_eur: row.training_price_eur
});

router.get("/search", async (req, res) => {
  const keyword = (req.query.q || "").trim();

  if (!keyword) {
    return res.json({ trainings: [], news: [] });
  }

  const like = `%${keyword}%`;
  const [trainings, news] = await Promise.all([
    query(`SELECT * FROM trainings WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC`, [like, like]),
    query(`SELECT * FROM news WHERE title LIKE ? OR content LIKE ? OR type LIKE ? ORDER BY created_at DESC`, [like, like, like])
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
    `SELECT er.*, t.id AS training_id, t.title AS training_title, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     WHERE er.email = ? AND er.phone = ?
     ORDER BY er.created_at DESC`,
    [email, phone]
  );

  res.json(enrollments.map((item) => serializeEnrollment(item, trainingFromRow(item))));
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

router.post("/enrollments/checkout", async (req, res) => {
  try {
    const { fullName, phone, email, password, confirmPassword, mode, trainingId, notes, country } = req.body;
    const normalizedEmail = (email || "").trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email et mot de passe obligatoires" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Le mot de passe doit contenir au moins 6 caracteres" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "La confirmation du mot de passe ne correspond pas" });
    }

    const [training] = await query("SELECT id, title, price_tnd, price_eur FROM trainings WHERE id = ?", [trainingId]);
    if (!training) {
      return res.status(404).json({ message: "Formation introuvable" });
    }

    const [existingUser] = await query("SELECT id, role FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existingUser?.role === "admin") {
      return res.status(400).json({ message: "Cet email est deja utilise par un compte administration" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const payment = paymentAmountForTraining(training, country || "Tunisie");

    const result = await insert(
      `INSERT INTO enrollment_requests (
        full_name, phone, email, password_hash, mode_label, training_id, notes, country_label,
        status, payment_status, payment_provider, amount_value, currency_code
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'En attente', 'Recu manquant', 'Virement/Visa', ?, ?)`,
      [fullName, phone, normalizedEmail, passwordHash, mode || "Presentiel", trainingId, notes || "", country || "Tunisie", payment.amountValue, payment.token]
    );

    res.status(201).json({
      message: "Inscription reussie. Le paiement se fait apres inscription par virement bancaire ou carte Visa (Binance, Redotpay).",
      enrollmentId: String(result.insertId),
      paymentStatus: "Recu manquant"
    });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: error.message || "Erreur lors de l inscription" });
  }
});

const buildReceiptUrl = (filename, folder) => `/uploads/${folder}/${filename}`;

const updateReceiptForEnrollment = async (enrollmentId, file) => {
  const extension = path.extname(file.originalname).replace(".", "").toUpperCase() || "FILE";
  const targetFolder = file.mimetype.startsWith("image/") ? "images" : "documents";
  const receiptUrl = buildReceiptUrl(file.filename, targetFolder);
  await insert(
    `UPDATE enrollment_requests
     SET payment_receipt_url = ?, payment_receipt_name = ?, payment_receipt_uploaded_at = NOW(), payment_status = IF(payment_status = 'Paye', payment_status, 'Recu')
     WHERE id = ?`,
    [receiptUrl, file.originalname || extension, enrollmentId]
  );
  const [updated] = await query(
    `SELECT er.*, t.id AS training_id, t.title AS training_title, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     WHERE er.id = ?`,
    [enrollmentId]
  );
  return updated ? serializeEnrollment(updated, trainingFromRow(updated)) : null;
};

router.post("/enrollments/:id/receipt", upload.single("file"), async (req, res) => {
  const { email, phone } = req.body;
  if (!req.file) return res.status(400).json({ message: "Le recu est obligatoire" });
  if (!email || !phone) return res.status(400).json({ message: "Email et telephone obligatoires" });

  const [row] = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [req.params.id]);
  if (!row) return res.status(404).json({ message: "Demande introuvable" });
  if (row.email.toLowerCase() !== String(email).trim().toLowerCase() || row.phone !== String(phone).trim()) {
    return res.status(403).json({ message: "Verification impossible. Email ou telephone incorrect." });
  }

  const updated = await updateReceiptForEnrollment(row.id, req.file);
  res.status(201).json({ message: "Recu enregistre.", enrollment: updated });
});

router.post("/enrollments/receipt", upload.single("file"), async (req, res) => {
  const { email, phone, trainingId } = req.body;
  if (!req.file) return res.status(400).json({ message: "Le recu est obligatoire" });
  if (!email || !phone) return res.status(400).json({ message: "Email et telephone obligatoires" });

  const params = [String(email).trim().toLowerCase(), String(phone).trim()];
  let sql =
    "SELECT id FROM enrollment_requests WHERE email = ? AND phone = ? ";
  if (trainingId) {
    sql += "AND training_id = ? ";
    params.push(Number(trainingId));
  }
  sql += "ORDER BY created_at DESC LIMIT 1";

  const [row] = await query(sql, params);
  if (!row) return res.status(404).json({ message: "Aucune demande retrouvee" });

  const updated = await updateReceiptForEnrollment(row.id, req.file);
  res.status(201).json({ message: "Recu enregistre.", enrollment: updated });
});

export default router;

