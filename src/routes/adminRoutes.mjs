import express from "express";
import path from "path";
import { auth } from "../middleware/auth.mjs";
import { requireRole } from "../middleware/role.mjs";
import { upload } from "../middleware/upload.mjs";
import { getStudentRecordBundle, insert, query } from "../config/db.mjs";
import { serializeEnrollment, syncEnrollmentBySession } from "../lib/stripePayments.mjs";

const router = express.Router();
router.use(auth, requireRole("admin"));

const uploadUrl = (filename, folder) => `/uploads/${folder}/${filename}`;

const mapStudent = (row) => ({
  id: row.id,
  _id: String(row.id),
  fullName: row.full_name,
  email: row.email,
  phone: row.phone,
  level: row.level_label,
  formationMode: row.formation_mode,
  role: row.role,
  avatar: row.avatar_url
});

const trainingFromEnrollmentRow = (item) => ({
  id: item.training_id_ref,
  title: item.training_title,
  price_tnd: item.training_price_tnd,
  price_eur: item.training_price_eur
});

router.get("/student-records", async (_req, res) => {
  const students = await query("SELECT id FROM users WHERE role = 'student' ORDER BY updated_at DESC, id DESC");
  const bundles = await Promise.all(students.map((item) => getStudentRecordBundle(item.id)));
  res.json(bundles.filter(Boolean));
});

router.post("/uploads/training-image", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Fichier manquant" });
  res.status(201).json({ message: "Image televersee.", url: uploadUrl(req.file.filename, "images") });
});

router.post("/students/:id/documents", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Fichier manquant" });
  const [record] = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [req.params.id]);
  if (!record) return res.status(404).json({ message: "Dossier etudiant non configure" });

  const extension = path.extname(req.file.originalname).replace(".", "").toUpperCase() || "FILE";
  await insert(
    `INSERT INTO student_documents (student_record_id, name, size_label, file_type, url)
     VALUES (?, ?, ?, ?, ?)`,
    [record.id, req.file.originalname, `${(req.file.size / (1024 * 1024)).toFixed(1)} MB`, extension, uploadUrl(req.file.filename, "documents")]
  );

  res.status(201).json({ message: "Document ajoute.", record: await getStudentRecordBundle(Number(req.params.id)) });
});

router.get("/students", async (_req, res) => {
  const students = await query("SELECT * FROM users WHERE role = 'student' ORDER BY created_at DESC");
  res.json(students.map(mapStudent));
});

router.get("/contacts", async (_req, res) => {
  const contacts = await query("SELECT * FROM contact_requests ORDER BY created_at DESC");
  res.json(contacts.map((item) => ({ _id: String(item.id), fullName: item.full_name, phone: item.phone, email: item.email, message: item.message, status: item.status, createdAt: item.created_at })));
});

router.get("/enrollments", async (_req, res) => {
  const enrollments = await query(
    `SELECT er.*, t.id AS training_id_ref, t.title AS training_title, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     ORDER BY er.created_at DESC`
  );
  res.json(enrollments.map((item) => serializeEnrollment(item, trainingFromEnrollmentRow(item))));
});

router.patch("/enrollments/:id", async (req, res) => {
  const result = await insert("UPDATE enrollment_requests SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Demande introuvable" });
  const [updated] = await query(
    `SELECT er.*, t.id AS training_id_ref, t.title AS training_title, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     WHERE er.id = ?`,
    [req.params.id]
  );
  res.json(serializeEnrollment(updated, trainingFromEnrollmentRow(updated)));
});

router.post("/enrollments/:id/verify-payment", async (req, res) => {
  const [enrollment] = await query("SELECT stripe_session_id FROM enrollment_requests WHERE id = ? LIMIT 1", [req.params.id]);
  if (!enrollment?.stripe_session_id) return res.status(404).json({ message: "Session Stripe introuvable" });
  const { enrollment: updated } = await syncEnrollmentBySession(enrollment.stripe_session_id);
  if (!updated) return res.status(404).json({ message: "Paiement introuvable" });
  const [row] = await query(
    `SELECT er.*, t.id AS training_id_ref, t.title AS training_title, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     WHERE er.id = ?`,
    [updated.id]
  );
  res.json(serializeEnrollment(row, trainingFromEnrollmentRow(row)));
});

router.delete("/enrollments/:id", async (req, res) => {
  const result = await insert("DELETE FROM enrollment_requests WHERE id = ?", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Demande introuvable" });
  res.json({ message: "Demande supprimee" });
});

router.patch("/contacts/:id", async (req, res) => {
  const result = await insert("UPDATE contact_requests SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Message introuvable" });
  const [updated] = await query("SELECT * FROM contact_requests WHERE id = ?", [req.params.id]);
  res.json({ _id: String(updated.id), fullName: updated.full_name, phone: updated.phone, email: updated.email, message: updated.message, status: updated.status });
});

router.put("/students/:id", async (req, res) => {
  const { fullName, email, phone, level, formationMode, avatar } = req.body;
  const result = await insert(
    `UPDATE users SET full_name = ?, email = ?, phone = ?, level_label = ?, formation_mode = ?, avatar_url = ? WHERE id = ? AND role = 'student'`,
    [fullName, email.toLowerCase(), phone || null, level || "Debutant", formationMode || "Presentiel", avatar || "/logo-academie.svg", req.params.id]
  );
  if (!result.affectedRows) return res.status(404).json({ message: "Eleve introuvable" });
  const [student] = await query("SELECT * FROM users WHERE id = ?", [req.params.id]);
  res.json(mapStudent(student));
});

router.delete("/students/:id", async (req, res) => {
  const result = await insert("DELETE FROM users WHERE id = ? AND role = 'student'", [req.params.id]);
  if (!result.affectedRows) return res.status(404).json({ message: "Eleve introuvable" });
  res.json({ message: "Eleve supprime" });
});

router.post("/students/:id/notes", async (req, res) => {
  const { module, score } = req.body;
  if (!module?.trim()) return res.status(400).json({ message: "Le module est obligatoire" });
  const [record] = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [req.params.id]);
  if (!record) return res.status(404).json({ message: "Dossier etudiant non configure" });
  await insert("INSERT INTO student_notes (student_record_id, module_name, score) VALUES (?, ?, ?)", [record.id, module, Number(score || 0)]);
  await insert("UPDATE student_records SET progress_percent = LEAST(progress_percent + 5, 100), hours_completed = hours_completed + 1 WHERE id = ?", [record.id]);
  res.json(await getStudentRecordBundle(Number(req.params.id)));
});

router.post("/students/:id/schedule", async (req, res) => {
  const { day, dateLabel, slot, subject, room, mode } = req.body;
  if (!subject?.trim()) return res.status(400).json({ message: "La matiere est obligatoire" });
  const [record] = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [req.params.id]);
  if (!record) return res.status(404).json({ message: "Dossier etudiant non configure" });
  await insert(
    `INSERT INTO student_schedule (student_record_id, day_label, date_label, slot_label, subject, room_label, mode_label)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [record.id, day || null, dateLabel || null, slot || null, subject, room || null, mode || "Presentiel"]
  );
  res.json(await getStudentRecordBundle(Number(req.params.id)));
});

router.post("/students/:id/message", async (req, res) => {
  const { title, message } = req.body;
  if (!message?.trim()) return res.status(400).json({ message: "Le message Administration est obligatoire" });
  const [record] = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [req.params.id]);
  if (!record) return res.status(404).json({ message: "Dossier etudiant non configure" });
  await insert("INSERT INTO student_hr_messages (student_record_id, title, message) VALUES (?, ?, ?)", [record.id, title || "Message Administration", message]);
  res.json(await getStudentRecordBundle(Number(req.params.id)));
});

router.post("/students/:id/assign-training", async (req, res) => {
  const { trainingId } = req.body;
  const [record] = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [req.params.id]);
  if (!record) return res.status(404).json({ message: "Dossier etudiant non configure" });
  await insert("UPDATE student_records SET formation_id = ?, progress_percent = GREATEST(progress_percent, 20) WHERE id = ?", [trainingId, record.id]);
  res.json(await getStudentRecordBundle(Number(req.params.id)));
});

router.get("/stats", async (_req, res) => {
  const [studentsCount] = await query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");
  const [trainingsCount] = await query("SELECT COUNT(*) AS count FROM trainings");
  const [postsCount] = await query("SELECT COUNT(*) AS count FROM news");
  const [onlineCount] = await query("SELECT COUNT(*) AS count FROM users WHERE role = 'student' AND formation_mode = 'En ligne'");
  const [certificatesCount] = await query("SELECT COUNT(*) AS count FROM student_records WHERE certificate_status = 'Certificat delivre'");
  const [contactsCount] = await query("SELECT COUNT(*) AS count FROM contact_requests WHERE status = 'Nouveau'");
  const [enrollmentsCount] = await query("SELECT COUNT(*) AS count FROM enrollment_requests WHERE status = 'En attente'");
  const [paidPaymentsCount] = await query("SELECT COUNT(*) AS count FROM enrollment_requests WHERE payment_status = 'Paye'");

  res.json({
    students: studentsCount.count,
    trainings: trainingsCount.count,
    posts: postsCount.count,
    online: onlineCount.count,
    onsite: studentsCount.count - onlineCount.count,
    certificates: certificatesCount.count,
    newContacts: contactsCount.count,
    pendingEnrollments: enrollmentsCount.count,
    paidPayments: paidPaymentsCount.count
  });
});

export default router;
