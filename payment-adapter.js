export const PAYMENT_ADAPTER_STATUS = 'unconfigured';

export async function createCheckoutPayment(payload) {
  if (!payload || !Array.isArray(payload.items)) {
    throw new Error('Payload de checkout inválido.');
  }

  return {
    status: 'unconfigured',
    provider: null,
    message: 'Gateway de pagamento ainda não configurado.',
    payloadPreview: {
      paymentMethod: payload.paymentMethod,
      itemCount: payload.items.length,
      orderBumpCount: payload.orderBumps?.length || 0,
      totalCents: payload.totalCents
    }
  };
}
