import { insert, query } from "../config/db.mjs";

const apiBaseUrl = () => (process.env.KONNECT_API_BASE_URL || "https://api.konnect.network/api/v2").replace(/\/$/, "");

const apiHeaders = () => {
  if (!process.env.KONNECT_API_KEY) {
    throw new Error("KONNECT_API_KEY manquante");
  }

  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.KONNECT_API_KEY
  };
};

const clientUrl = () => process.env.CLIENT_URL || "http://localhost:5173";

const paymentToken = (payment = {}, fallback = "TND") => (payment?.token || fallback || "TND").toUpperCase();

const paymentAmountMajor = (payment = {}, fallback = 0) => {
  const rawAmount = Number(payment?.amount ?? payment?.reachedAmount ?? fallback ?? 0);
  const token = paymentToken(payment);
  const divisor = token === "TND" ? 1000 : 100;
  return Math.round((rawAmount / divisor) * 100) / 100;
};

const mapKonnectError = (response, data, fallbackMessage) => {
  const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
  const rawMessage = firstError?.message || data?.message || data?.error || "";
  const rawCode = firstError?.code || "";

  if (rawCode === "AUTHENTICATE_TOKEN_INVALID" && /status de cette organisation/i.test(rawMessage)) {
    return "Paiement Konnect indisponible pour le moment : votre organisation Konnect est encore en cours de validation.";
  }

  const details = typeof data === "object" ? JSON.stringify(data) : String(data || "");
  return rawMessage || `${fallbackMessage} (HTTP ${response.status})${details ? ` - ${details}` : ""}`;
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

export const paymentAmountForTraining = (training, countryLabel = "Tunisie") => {
  const isTunisia = (countryLabel || "").toLowerCase().includes("tun");
  if (isTunisia) {
    const amountValue = Number(training?.price_tnd || 0);
    return {
      token: "TND",
      amountValue,
      amountMinor: Math.round(amountValue * 1000)
    };
  }

  const eurValue = Number(training?.price_eur || 0);
  const fallbackValue = Number(training?.price_tnd || 0) > 0 ? Math.round((Number(training.price_tnd) / 3.2) * 100) / 100 : 0;
  const amountValue = eurValue > 0 ? eurValue : fallbackValue;
  return {
    token: "EUR",
    amountValue,
    amountMinor: Math.round(amountValue * 100)
  };
};

const normalizePaymentStatus = (payment) => {
  if (payment?.status === "completed") return "Paye";
  if (payment?.status === "pending") return "En attente";
  if (payment?.status === "failed") return "Echoue";
  return "En attente";
};

export const createKonnectPayment = async ({ enrollmentId, training, fullName, phone, email, country, mode }) => {
  if (!process.env.KONNECT_WALLET_ID) {
    throw new Error("KONNECT_WALLET_ID manquante");
  }

  const [firstName, ...rest] = (fullName || "").trim().split(/\s+/);
  const payment = paymentAmountForTraining(training, country);
  const payload = {
    receiverWalletId: process.env.KONNECT_WALLET_ID,
    token: payment.token,
    amount: payment.amountMinor,
    type: "immediate",
    description: `Inscription formation ${training.title}`,
    acceptedPaymentMethods: ["bank_card", "wallet", "e-DINAR"],
    lifespan: 30,
    checkoutForm: true,
    addPaymentFeesToAmount: false,
    firstName: firstName || fullName,
    lastName: rest.join(" ") || firstName || fullName,
    phoneNumber: phone,
    email,
    orderId: `enrollment-${enrollmentId}`,
    webhook: `${clientUrl()}/api/payments/konnect/webhook`,
    silentWebhook: true,
    successUrl: `${clientUrl()}/paiement/succes?payment_ref={paymentRef}`,
    failUrl: `${clientUrl()}/paiement/annule?payment_ref={paymentRef}`,
    theme: "light"
  };

  const response = await fetch(`${apiBaseUrl()}/payments/init-payment`, {
    method: "POST",
    headers: apiHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mapKonnectError(response, data, "Erreur Konnect lors de la creation du paiement"));
  }

  return {
    payUrl: data.payUrl,
    paymentRef: data.paymentRef,
    token: payment.token,
    amountValue: payment.amountValue
  };
};

export const getKonnectPaymentDetails = async (paymentRef) => {
  const response = await fetch(`${apiBaseUrl()}/payments/${paymentRef}`, {
    method: "GET",
    headers: {
      "x-api-key": process.env.KONNECT_API_KEY
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(mapKonnectError(response, data, "Erreur Konnect lors de la verification du paiement"));
  }

  return data.payment || data;
};

export const finalizeEnrollmentPayment = async (enrollmentId, payment = null) => {
  const rows = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [enrollmentId]);
  const enrollment = rows[0];
  if (!enrollment) return null;

  if (enrollment.payment_status === "Paye" && enrollment.student_user_id) {
    return enrollment;
  }

  const studentId = await ensureStudentForEnrollment(enrollment);
  const amount = payment ? paymentAmountMajor(payment, enrollment.amount_value || 0) : Number(enrollment.amount_value || 0);
  const currency = paymentToken(payment, enrollment.currency_code || "TND");

  await insert(
    `UPDATE enrollment_requests
     SET status = 'Confirmee',
         payment_status = 'Paye',
         payment_provider = 'Konnect',
         amount_value = ?,
         currency_code = ?,
         paid_at = CURRENT_TIMESTAMP,
         student_user_id = ?
     WHERE id = ?`,
    [amount, currency, studentId, enrollmentId]
  );

  const updated = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [enrollmentId]);
  return updated[0] || null;
};

export const syncEnrollmentByPaymentRef = async (paymentRef) => {
  const payment = await getKonnectPaymentDetails(paymentRef);
  const paymentLookupRef = String(payment?.id || "").trim();
  const originalPaymentRef = String(paymentRef || "").trim();
  const rows = await query("SELECT * FROM enrollment_requests WHERE payment_ref IN (?, ?) LIMIT 1", [paymentLookupRef || originalPaymentRef, originalPaymentRef || paymentLookupRef]);
  const enrollment = rows[0];

  if (!enrollment) {
    return { payment, enrollment: null };
  }

  if (payment.status === "completed") {
    const finalized = await finalizeEnrollmentPayment(enrollment.id, payment);
    return { payment, enrollment: finalized };
  }

  const nextPaymentStatus = normalizePaymentStatus(payment);
  if (nextPaymentStatus !== enrollment.payment_status) {
    await insert(
      `UPDATE enrollment_requests
       SET payment_status = ?, payment_provider = 'Konnect', amount_value = ?, currency_code = ?
       WHERE id = ?`,
      [nextPaymentStatus, paymentAmountMajor(payment, enrollment.amount_value || 0), paymentToken(payment, enrollment.currency_code || "TND"), enrollment.id]
    );
  }

  const updated = await query("SELECT * FROM enrollment_requests WHERE id = ? LIMIT 1", [enrollment.id]);
  return { payment, enrollment: updated[0] || enrollment };
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
  paymentRef: item.payment_ref,
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
