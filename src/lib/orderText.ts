import { formatDate } from './format';
import type { Fulfillment } from './types';

/** "Pickup · Sat, Oct 17 · 12:00 – 1:00 PM" */
export function fulfillmentLine(o: { fulfillment: Fulfillment; pickup_date: string; pickup_slot: string | null }): string {
  return [o.fulfillment === 'delivery' ? 'Delivery' : 'Pickup', formatDate(o.pickup_date, 'short'), o.pickup_slot].filter(Boolean).join(' · ');
}

export function customizationText(c: { option_name: string; value_label: string }[], instructions?: string | null): string {
  const parts = c.map((x) => x.value_label);
  if (instructions) parts.push(instructions);
  return parts.join(' · ');
}
