import type { Tone } from '../theme';
import type { OrderStatus, PaymentMethod, PaymentStatus } from './types';

export const ORDER_STEPS: OrderStatus[] = ['received', 'confirmed', 'preparing', 'ready', 'completed'];

export const customerStatusLabel: Record<OrderStatus, string> = {
  received: 'Order Received',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready for Pickup',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const chefStatusLabel: Record<OrderStatus, string> = {
  received: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const statusTone: Record<OrderStatus, Tone> = {
  received: 'new',
  confirmed: 'new',
  preparing: 'preparing',
  ready: 'pending',
  completed: 'neutral',
  cancelled: 'unpaid',
};

/** The chef's next step for an order, if any. */
export const nextStep: Partial<Record<OrderStatus, { label: string; to: OrderStatus }>> = {
  received: { label: 'Confirm Order', to: 'confirmed' },
  confirmed: { label: 'Start Preparing', to: 'preparing' },
  preparing: { label: 'Mark Ready', to: 'ready' },
  ready: { label: 'Complete Order', to: 'completed' },
};

export const paymentLabel: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partially_paid: 'Partially Paid',
  paid: 'Paid',
  refunded: 'Refunded',
};

export const paymentTone: Record<PaymentStatus, Tone> = {
  unpaid: 'unpaid',
  partially_paid: 'pending',
  paid: 'paid',
  refunded: 'neutral',
};

/** Customers see "Payment Pending" until the chef confirms money arrived. */
export function customerPaymentLabel(s: PaymentStatus): string {
  return s === 'paid' ? 'Paid' : s === 'refunded' ? 'Refunded' : 'Payment Pending';
}

export function customerPaymentTone(s: PaymentStatus): Tone {
  return s === 'paid' ? 'paid' : s === 'refunded' ? 'neutral' : 'pending';
}

export const methodLabel: Record<PaymentMethod, string> = {
  cash: 'Cash',
  zelle: 'Zelle',
  cashapp: 'Cash App',
  card: 'Card / Apple Pay',
};
