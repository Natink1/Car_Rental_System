function getCompletedPayment(booking) {
  const payments = Array.isArray(booking?.payments) ? booking.payments : [];
  return payments.find((payment) => payment.payment_status === 'completed') || null;
}

export function PaymentReceiptActions({ booking }) {
  const payment = getCompletedPayment(booking);
  const reference = payment?.transaction_reference;

  if (!payment || !reference || String(reference).startsWith('SIM-')) return null;

  // Chapa test receipts use the checkout host/path format:
  // https://checkout.chapa.co/checkout/test-payment-receipt/{reference}
  const receiptUrl = `https://checkout.chapa.co/checkout/test-payment-receipt/${encodeURIComponent(reference)}`;

  const openReceipt = () => {
    window.open(receiptUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button type="button" className="btn btn-secondary" onClick={openReceipt}>
        Receipt
      </button>
    </>
  );
}
