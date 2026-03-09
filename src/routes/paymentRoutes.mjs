import express from "express";
import { query } from "../config/db.mjs";
import { finalizeEnrollmentPayment, getStripeClient, serializeEnrollment, syncEnrollmentBySession } from "../lib/stripePayments.mjs";

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

export const stripeWebhookHandler = async (req, res) => {
  try {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(500).send("STRIPE_WEBHOOK_SECRET manquante");
    }

    const stripe = getStripeClient();
    const signature = req.headers["stripe-signature"];
    const event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const enrollmentId = Number(session.metadata?.enrollmentId || 0);
      if (enrollmentId) {
        await finalizeEnrollmentPayment(enrollmentId, session);
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      await syncEnrollmentBySession(session.id);
    }

    res.json({ received: true });
  } catch (error) {
    console.error(error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};

router.get("/session-status", async (req, res) => {
  const sessionId = (req.query.session_id || "").trim();
  if (!sessionId) {
    return res.status(400).json({ message: "session_id obligatoire" });
  }

  const { session, enrollment } = await syncEnrollmentBySession(sessionId);
  if (!enrollment) {
    return res.status(404).json({ message: "Paiement introuvable" });
  }

  const row = await loadEnrollmentWithTraining(enrollment.id);
  if (!row) {
    return res.status(404).json({ message: "Inscription introuvable" });
  }

  res.json({
    checkoutStatus: session.status,
    stripePaymentStatus: session.payment_status,
    enrollment: serializeEnrollment(row, trainingFromRow(row)),
    loginReady: row.payment_status === "Paye" && !!row.student_user_id,
    loginEmail: row.email
  });
});

export default router;
