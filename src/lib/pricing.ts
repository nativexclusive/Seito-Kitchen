import { money, num } from './format';
import type { ItemOption, MenuEntry } from './types';

/** Selected value ids per option id. */
export type Selections = Record<string, string[]>;

export function entryPrice(entry: Pick<MenuEntry, 'price_override' | 'menu_items'>): number {
  return entry.price_override !== null ? num(entry.price_override) : num(entry.menu_items.base_price);
}

export function defaultSelections(options: ItemOption[]): Selections {
  const sel: Selections = {};
  for (const o of options) {
    const defaults = o.item_option_values.filter((v) => v.is_default).map((v) => v.id);
    sel[o.id] = o.kind === 'single' ? defaults.slice(0, 1) : defaults;
  }
  return sel;
}

export function toggleValue(sel: Selections, option: ItemOption, valueId: string): Selections {
  const current = sel[option.id] ?? [];
  if (option.kind === 'single') {
    // A required single choice can't be cleared, only changed.
    if (current[0] === valueId) return option.required ? sel : { ...sel, [option.id]: [] };
    return { ...sel, [option.id]: [valueId] };
  }
  return {
    ...sel,
    [option.id]: current.includes(valueId) ? current.filter((id) => id !== valueId) : [...current, valueId],
  };
}

/** Mirrors the server's pricing in place_order(); the server total is authoritative. */
export function unitPrice(basePrice: number, options: ItemOption[], sel: Selections): number {
  let total = basePrice;
  for (const o of options) {
    for (const v of o.item_option_values) {
      if (sel[o.id]?.includes(v.id)) total += num(v.price_delta);
    }
  }
  return Math.round(total * 100) / 100;
}

export function missingRequired(options: ItemOption[], sel: Selections): ItemOption | undefined {
  return options.find((o) => o.required && !(sel[o.id]?.length));
}

/** "Beef (+$2.00) · Regular · Extra Rice" */
export function describeSelections(options: ItemOption[], sel: Selections): string {
  const parts: string[] = [];
  for (const o of [...options].sort((a, b) => a.sort_order - b.sort_order)) {
    for (const v of [...o.item_option_values].sort((a, b) => a.sort_order - b.sort_order)) {
      if (!sel[o.id]?.includes(v.id)) continue;
      parts.push(o.kind === 'single' && num(v.price_delta) > 0 ? `${v.label} (+${money(v.price_delta)})` : v.label);
    }
  }
  return parts.join(' · ');
}

export function selectedValueIds(sel: Selections): string[] {
  return Object.values(sel).flat().sort();
}

export function remaining(entry: Pick<MenuEntry, 'max_quantity' | 'sold_count'>): number | null {
  return entry.max_quantity === null ? null : Math.max(0, entry.max_quantity - entry.sold_count);
}

export function isSoldOut(entry: Pick<MenuEntry, 'sold_out' | 'max_quantity' | 'sold_count'>): boolean {
  return entry.sold_out || remaining(entry) === 0;
}
