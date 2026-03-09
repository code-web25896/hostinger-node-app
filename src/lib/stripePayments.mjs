import Stripe from "stripe";
import { insert, query } from "../config/db.mjs";

let stripeClient;

export const getStripeClient = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY manquante");
  }

  if (!stripeClient) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY);
  }

  return stripeClient;
};

export const paymentAmountForTraining = (training) => {
  const eurValue = Number(training?.price_eur || 0);
  const fallbackValue = Number(training?.price_tnd || 0) > 0 ? Math.round((Number(training.price_tnd) / 3.2) * 100) / 100 : 0;
  const amountValue = eurValue > 0 ? eurValue : fallbackValue;
  return {
    currency: "eur",
    amountValue,
    amountMinor: Math.round(amountValue * 100)
  };
};

const normalizePaymentStatus = (session) => {
  if (session?.payment_status === "paid") return "Paye";
  if (session?.status === "expired") return "Expire";
  if (session?.status === "complete") return "En verification";
  return "En attente";
};

const ensureStudentForEnrollment = async (enrollment) => {
  const existingUsers = await query("SELECT id, role FROM users WHERE email = ? LIMIT 1", [enrollment.email]);
  const existingUser = existingUsers[0];

  if (existingUser?.role === "admin") {
    throw new Error("Cet email est deja utilise par un compte administration.");
  }

  let studentId = existingUser?.id || enrollment.student_user_id || null;

  if (!studentId) {
    const studentResult = await insert(
      `INSERT INTO users (full_name, email, password_hash, phone, level_label, formation_mode, role, avatar_url)
       VALUES (?, ?, ?, ?, 'Debutant', ?, 'student', ?)` ,
      [enrollment.full_name, enrollment.email, enrollment.password_hash, enrollment.phone || null, enrollment.mode_label || "Presentiel", "/logo.jpeg"]
    );
    studentId = studentResult.insertId;
  }

  const records = await query("SELECT id FROM student_records WHERE student_id = ? LIMIT 1", [studentId]);
  if (!records[0]) {
    await insert(
      `INSERT INTO student_records (student_id, formation_id, avatar_url, progress_percent, hours_completed, total_hours, internship_label, certificate_status)
       VALUES (?, ?, ?, 15, 0, 24, 'En attente', 'En cours d''acquisition')`,
      [studentId, enrollment.training_id, "/logo.jpeg"]
    );
  } else {
    await insert(
      `UPDATE student_records
       SET formation_id = ?, avatar_url = COALESCE(NULLIF(avatar_url, ''), '/logo.jpeg')
       WHERE student_id = ?`,
      [enrollment.training_id, studentId]
    );
  }

  return studentId;
};

export const finalizeEnrollmentPayment = async (enrollmentId, session = null) => {
  const rows = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [enrollmentId]);
  const enrollment = rows[0];
  if (!enrollment) return null;

  if (enrollment.payment_status === "Paye" && enrollment.student_user_id) {
    return enrollment;
  }

  const studentId = await ensureStudentForEnrollment(enrollment);
  const amount = session?.amount_total != null ? Number(session.amount_total) / 100 : Number(enrollment.amount_value || 0);
  const currency = (session?.currency || enrollment.currency_code || "eur").toUpperCase();

  await insert(
    `UPDATE enrollment_requests
     SET status = 'Confirmee',
         payment_status = 'Paye',
         payment_provider = 'Stripe',
         stripe_session_id = COALESCE(?, stripe_session_id),
         amount_value = ?,
         currency_code = ?,
         paid_at = CURRENT_TIMESTAMP,
         student_user_id = ?
     WHERE id = ?`,
    [session?.id || null, amount, currency, studentId, enrollmentId]
  );

  const updated = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [enrollmentId]);
  return updated[0] || null;
};

export const syncEnrollmentBySession = async (sessionId) => {
  const stripe = getStripeClient();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const rows = await query("SELECT * FROM enrollment_requests WHERE stripe_session_id = ? LIMIT 1", [session.id]);
  const enrollment = rows[0];

  if (!enrollment) {
    return { session, enrollment: null };
  }

  if (session.payment_status === "paid") {
    const finalized = await finalizeEnrollmentPayment(enrollment.id, session);
    return { session, enrollment: finalized };
  }

  const nextPaymentStatus = normalizePaymentStatus(session);
  if (nextPaymentStatus !== enrollment.payment_status) {
    await insert(
      `UPDATE enrollment_requests
       SET payment_status = ?, payment_provider = 'Stripe', stripe_session_id = COALESCE(?, stripe_session_id)
       WHERE id = ?`,
      [nextPaymentStatus, session.id, enrollment.id]
    );
  }

  const updated = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [enrollment.id]);
  return { session, enrollment: updated[0] || enrollment };
};

export const serializeEnrollment = (item, training = null) => ({
  id: item.id,
  _id: String(item.id),
  fullName: item.full_name,
  phone: item.phone,
  email: item.email,
  mode: item.mode_label,
  notes: item.notes,
  country: item.country_label,
  status: item.status,
  paymentStatus: item.payment_status,
  paymentProvider: item.payment_provider,
  paymentAmount: item.amount_value != null ? Number(item.amount_value) : null,
  paymentCurrency: item.currency_code,
  paidAt: item.paid_at,
  stripeSessionId: item.stripe_session_id,
  studentUserId: item.student_user_id ? String(item.student_user_id) : null,
  training: training
    ? {
        _id: String(training.id),
        title: training.title,
        priceTND: Number(training.price_tnd),
        priceEUR: Number(training.price_eur)
      }
    : null
});
