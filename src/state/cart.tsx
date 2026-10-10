import { randomUUID } from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { load, save } from './storage';

export interface CartLine {
  key: string;
  menuItemId: string;
  name: string;
  imageUrl: string | null;
  /** "Beef (+$2.00) · Regular" */
  desc: string;
  /** Display price; the server recomputes it when the order is placed. */
  unitPrice: number;
  quantity: number;
  optionValueIds: string[];
  instructions: string;
}

export interface Contact {
  name: string;
  phone: string;
  email: string;
}

export interface SavedOrder {
  token: string;
  orderNumber: number;
  placedAt: string;
}

interface Persisted {
  menuId: string | null;
  lines: CartLine[];
  requestId: string;
  contact: Contact;
  orders: SavedOrder[];
}

const KEY = 'mk.cart.v1';
const empty: Persisted = { menuId: null, lines: [], requestId: randomUUID(), contact: { name: '', phone: '', email: '' }, orders: [] };

interface CartApi extends Persisted {
  ready: boolean;
  count: number;
  subtotal: number;
  add: (menuId: string, line: Omit<CartLine, 'key'>) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  setContact: (c: Contact) => void;
  /** Call after an order is placed: clears the cart and remembers the order on this device. */
  completeOrder: (order: SavedOrder) => void;
}

const CartContext = createContext<CartApi | null>(null);

// Lines merge when dish, options and instructions are identical.
function lineKey(l: Omit<CartLine, 'key'>): string {
  return [l.menuItemId, [...l.optionValueIds].sort().join(','), l.instructions.trim().toLowerCase()].join('|');
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    load<Persisted>(KEY).then((saved) => {
      if (saved) setState({ ...empty, ...saved });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (ready) save(KEY, state);
  }, [state, ready]);

  // Any change to the cart contents gets a fresh idempotency key; retrying an
  // unchanged cart reuses the old one so a lost response can't create a duplicate order.
  const update = useCallback((fn: (s: Persisted) => Persisted, contentsChanged = true) => {
    setState((s) => {
      const next = fn(s);
      return contentsChanged ? { ...next, requestId: randomUUID() } : next;
    });
  }, []);

  const api = useMemo<CartApi>(() => {
    const count = state.lines.reduce((t, l) => t + l.quantity, 0);
    const subtotal = Math.round(state.lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0) * 100) / 100;
    return {
      ...state,
      ready,
      count,
      subtotal,
      add: (menuId, line) =>
        update((s) => {
          // A cart belongs to one menu; switching menus starts a new cart.
          const lines = s.menuId === menuId ? [...s.lines] : [];
          const key = lineKey(line);
          const i = lines.findIndex((l) => l.key === key);
          if (i >= 0) lines[i] = { ...lines[i], quantity: Math.min(50, lines[i].quantity + line.quantity) };
          else lines.push({ ...line, key });
          return { ...s, menuId, lines };
        }),
      setQuantity: (key, quantity) =>
        update((s) => ({ ...s, lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(50, quantity)) } : l)) })),
      remove: (key) => update((s) => ({ ...s, lines: s.lines.filter((l) => l.key !== key) })),
      setContact: (contact) => update((s) => ({ ...s, contact }), false),
      completeOrder: (order) =>
        update((s) => ({ ...s, lines: [], menuId: null, orders: [order, ...s.orders.filter((o) => o.token !== order.token)].slice(0, 20) })),
    };
  }, [state, ready, update]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
