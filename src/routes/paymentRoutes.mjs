import express from "express";
import { query } from "../config/db.mjs";
import { finalizeEnrollmentPayment, serializeEnrollment, syncEnrollmentByPaymentRef } from "../lib/konnectPayments.mjs";

const router = express.Router();

const loadEnrollmentWithTraining = async (id) => {
  const rows = await query(
    `SELECT er.*, t.id AS training_ref_id, t.title AS training_title, t.price_tnd AS training_price_tnd, t.price_eur AS training_price_eur
     FROM enrollment_requests er
     INNER JOIN trainings t ON t.id = er.training_id
     WHERE er.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const trainingFromRow = (row) => ({
  id: row.training_ref_id,
  title: row.training_title,
  price_tnd: row.training_price_tnd,
  price_eur: row.training_price_eur
});

export const konnectWebhookHandler = async (req, res) => {
  try {
    const paymentRef = (req.query.payment_ref || req.query.paymentRef || req.query.paymentId || "").trim();
    if (!paymentRef) {
      return res.status(400).send("payment_ref manquant");
    }

    const { payment, enrollment } = await syncEnrollmentByPaymentRef(paymentRef);
    if (payment?.status === "completed" && enrollment?.id) {
      await finalizeEnrollmentPayment(enrollment.id, payment);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(400).send(`Konnect webhook error: ${error.message}`);
  }
};

router.get("/session-status", async (req, res) => {
  const paymentRef = (req.query.payment_ref || req.query.paymentRef || "").trim();
  if (!paymentRef) {
    return res.status(400).json({ message: "payment_ref obligatoire" });
  }

  const { payment, enrollment } = await syncEnrollmentByPaymentRef(paymentRef);
  if (!enrollment) {
    return res.status(404).json({ message: "Paiement introuvable" });
  }

  const row = await loadEnrollmentWithTraining(enrollment.id);
  if (!row) {
    return res.status(404).json({ message: "Inscription introuvable" });
  }

  res.json({
    checkoutStatus: payment.status,
    paymentStatus: payment.status,
    enrollment: serializeEnrollment(row, trainingFromRow(row)),
    loginReady: row.payment_status === "Paye" && !!row.student_user_id,
    loginEmail: row.email
  });
});

export default router;
