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
  paymentReceiptUrl: item.payment_receipt_url,
  paymentReceiptName: item.payment_receipt_name,
  paymentReceiptUploadedAt: item.payment_receipt_uploaded_at,
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
