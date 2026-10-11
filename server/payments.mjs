import { timingSafeEqual } from 'node:crypto';

export const PAYMENT_PLANS = Object.freeze({
  essential: Object.freeze({ name: 'Esencial', amount: 69, passes: 50 }),
  premium: Object.freeze({ name: 'Premium', amount: 119, passes: 150 }),
  deluxe: Object.freeze({ name: 'Deluxe', amount: 199, passes: 350 }),
});

export class PaymentError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = 'PaymentError';
    this.status = status;
  }
}

export function safeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createPaymentProvider({ mode }) {
  if (mode === 'mock') {
    return {
      mode,
      async createCheckout({ payment }) {
        return { checkoutUrl: `/#/checkout?id=${encodeURIComponent(payment.id)}`, providerReference: `demo-${payment.id}` };
      },
      async fetchPayment() {
        throw new PaymentError('El modo demo no consulta una pasarela real.', 409);
      },
      verifyWebhook: () => false,
    };
  }

  if (mode === 'external') return {
    mode,
    async createCheckout() { throw new PaymentError('Cobros deshabilitados aquí. Integra el servicio externo de billing.', 503); },
    async fetchPayment() { throw new PaymentError('Consulta de cobros pertenece al servicio externo de billing.', 503); },
    verifyWebhook: () => false,
  };
  throw new PaymentError('Modo de pagos no soportado.', 503);
}
