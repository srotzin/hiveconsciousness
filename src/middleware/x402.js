/**
 * HiveConsciousness — x402 Payment Middleware
 * Enforces payment requirements with HTTP 402 response format.
 */

export function requirePayment(amountUSD, description) {
  return (req, res, next) => {
    const paymentToken = req.headers['x-payment-token'];
    const paymentVerified = req.headers['x-payment-verified'] === 'true';

    if (!paymentToken) {
      return res.status(402).json({
        error: 'payment_required',
        payment: {
          amount: amountUSD,
          currency: 'USD',
          description,
          accepts: ['x-payment-token'],
          network: 'hive-payments',
          instructions: `This endpoint requires a payment of $${amountUSD.toFixed(2)}. Include X-Payment-Token header with a valid payment receipt.`,
        },
      });
    }

    // In production, validate the payment token against HiveTrust ledger.
    // For Phase 1, accept any non-empty token as proof of payment intent.
    req.paymentAmount = amountUSD;
    req.paymentToken = paymentToken;
    req.paymentVerified = paymentVerified;
    next();
  };
}
