import { num } from './format';

interface PrepOrder {
  status: string;
  order_number: number;
  customer_name: string;
  total: number | string;
  amount_received: number | string;
  payment_status: string;
  order_items: { name: string; quantity: number; instructions?: string | null; order_item_customizations: { option_name: string; value_label: string }[] }[];
}

export interface PrepReport {
  dishes: { name: string; qty: number; options: { label: string; qty: number }[] }[];
  instructions: { orderNumber: number; customer: string; dish: string; text: string }[];
  unpaid: { orderNumber: number; customer: string; balance: number }[];
  orderCount: number;
}

/** Saturday preparation summary: portions per dish, choice breakdown, notes, balances. */
export function prepReport(orders: PrepOrder[]): PrepReport {
  const live = orders.filter((o) => o.status !== 'cancelled');
  const dishes = new Map<string, { qty: number; options: Map<string, number> }>();
  const instructions: PrepReport['instructions'] = [];
  for (const o of live) {
    for (const i of o.order_items) {
      const d = dishes.get(i.name) ?? { qty: 0, options: new Map() };
      d.qty += i.quantity;
      for (const c of i.order_item_customizations) {
        const label = `${c.option_name}: ${c.value_label}`;
        d.options.set(label, (d.options.get(label) ?? 0) + i.quantity);
      }
      dishes.set(i.name, d);
      if (i.instructions) instructions.push({ orderNumber: o.order_number, customer: o.customer_name, dish: i.name, text: i.instructions });
    }
  }
  return {
    orderCount: live.length,
    dishes: [...dishes.entries()]
      .map(([name, d]) => ({ name, qty: d.qty, options: [...d.options.entries()].map(([label, qty]) => ({ label, qty })).sort((a, b) => a.label.localeCompare(b.label)) }))
      .sort((a, b) => b.qty - a.qty),
    instructions,
    unpaid: live
      .filter((o) => o.payment_status !== 'paid')
      .map((o) => ({ orderNumber: o.order_number, customer: o.customer_name, balance: num(o.total) - num(o.amount_received) }))
      .filter((u) => u.balance > 0),
  };
}
