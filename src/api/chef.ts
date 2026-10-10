import { supabase } from '../lib/supabase';
import type {
  CateringRequest,
  CustomerDirectoryRow,
  HistoryRow,
  Menu,
  MenuItem,
  MenuType,
  OrderItemRow,
  OrderRow,
  OrderStatus,
  PaymentRow,
  SpecialEvent,
} from '../lib/types';
import { MENU_SELECT } from './public';

// ---------------------------------------------------------------------------
// Menus
// ---------------------------------------------------------------------------
export async function listMenus(): Promise<Menu[]> {
  const { data, error } = await supabase
    .from('menus')
    .select(MENU_SELECT)
    .neq('status', 'archived')
    .order('pickup_date', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as Menu[];
}

export async function fetchMenuForEdit(id: string): Promise<Menu> {
  const { data, error } = await supabase.from('menus').select(MENU_SELECT).eq('id', id).single();
  if (error) throw error;
  const m = data as Menu;
  m.menu_entries.sort((a, b) => a.sort_order - b.sort_order);
  return m;
}

/** The weekly menu the dashboard is about: the next upcoming one, else the latest. */
export async function fetchFocusMenu(): Promise<Menu | null> {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = await supabase
    .from('menus')
    .select(MENU_SELECT)
    .eq('type', 'weekly')
    .neq('status', 'archived')
    .gte('pickup_date', today)
    .order('pickup_date')
    .limit(1);
  if (upcoming.error) throw upcoming.error;
  if (upcoming.data?.length) return upcoming.data[0] as Menu;
  const latest = await supabase.from('menus').select(MENU_SELECT).eq('type', 'weekly').order('pickup_date', { ascending: false }).limit(1);
  if (latest.error) throw latest.error;
  return (latest.data?.[0] as Menu | undefined) ?? null;
}

export async function listCatalog(): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*, item_options(*, item_option_values(*))')
    .is('archived_at', null)
    .order('sort_order');
  if (error) throw error;
  return data as MenuItem[];
}

export interface MenuDraft {
  id?: string;
  type: MenuType;
  title: string;
  description: string;
  pickup_date: string;
  order_deadline: string;
  accepting_orders: boolean;
  entries: { menu_item_id: string; max_quantity: number | null; sold_out: boolean }[];
}

/** Create or update a menu and its dish list. Returns the menu id. */
export async function saveMenu(draft: MenuDraft): Promise<string> {
  const fields = {
    type: draft.type,
    title: draft.title.trim() || 'Untitled menu',
    description: draft.description,
    pickup_date: draft.pickup_date,
    order_deadline: draft.order_deadline,
    accepting_orders: draft.accepting_orders,
  };
  let id = draft.id;
  if (id) {
    const { error } = await supabase.from('menus').update(fields).eq('id', id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('menus').insert(fields).select('id').single();
    if (error) throw error;
    id = data.id as string;
  }

  // Upsert the dishes on the menu (keeping sold_count), then drop removed ones.
  const keep = draft.entries.map((e) => e.menu_item_id);
  if (draft.entries.length) {
    const { error } = await supabase.from('menu_entries').upsert(
      draft.entries.map((e, i) => ({ menu_id: id, menu_item_id: e.menu_item_id, max_quantity: e.max_quantity, sold_out: e.sold_out, sort_order: i + 1 })),
      { onConflict: 'menu_id,menu_item_id' },
    );
    if (error) throw error;
  }
  let del = supabase.from('menu_entries').delete().eq('menu_id', id);
  if (keep.length) del = del.not('menu_item_id', 'in', `(${keep.join(',')})`);
  const { error: delError } = await del;
  if (delError) throw delError;
  return id!;
}

export async function setSoldOut(menuId: string, menuItemId: string, soldOut: boolean): Promise<void> {
  const { error } = await supabase.from('menu_entries').update({ sold_out: soldOut }).eq('menu_id', menuId).eq('menu_item_id', menuItemId);
  if (error) throw error;
}

export async function publishMenu(menuId: string, notify: boolean): Promise<number> {
  const { data, error } = await supabase.rpc('chef_publish_menu', { p_menu_id: menuId, p_notify: notify });
  if (error) throw error;
  return data as number;
}

export async function setMenuStatus(menuId: string, status: 'draft' | 'archived'): Promise<void> {
  const { error } = await supabase.from('menus').update({ status }).eq('id', menuId);
  if (error) throw error;
}

export async function countSubscribers(type: MenuType): Promise<number> {
  const col = type === 'weekly' ? 'new_menus' : 'holiday_menus';
  const { count, error } = await supabase
    .from('notification_preferences')
    .select('customer_id, customers!inner(marketing_opt_in)', { count: 'exact', head: true })
    .eq(col, true)
    .eq('customers.marketing_opt_in', true);
  if (error) throw error;
  return count ?? 0;
}

export async function saveDish(dish: Pick<MenuItem, 'name' | 'description' | 'category' | 'base_price' | 'is_hidden'> & { id?: string; image_url?: string | null }): Promise<string> {
  if (dish.id) {
    const { error } = await supabase.from('menu_items').update(dish).eq('id', dish.id);
    if (error) throw error;
    return dish.id;
  }
  const { data, error } = await supabase.from('menu_items').insert(dish).select('id').single();
  if (error) throw error;
  return data.id as string;
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export type OrderListRow = OrderRow & {
  order_items: { quantity: number; name: string; instructions: string | null; menu_item_id: string | null; order_item_customizations: { option_name: string; value_label: string }[] }[];
};

export async function listOrders(menuId?: string): Promise<OrderListRow[]> {
  let q = supabase
    .from('orders')
    .select('*, order_items(quantity, name, instructions, menu_item_id, order_item_customizations(option_name, value_label))')
    .order('order_number', { ascending: false })
    .limit(300);
  if (menuId) q = q.eq('menu_id', menuId);
  const { data, error } = await q;
  if (error) throw error;
  return data as OrderListRow[];
}

export interface OrderDetail extends OrderRow {
  order_items: OrderItemRow[];
  payments: PaymentRow[];
  order_status_history: HistoryRow[];
  customers: { created_at: string; notes: string | null } | null;
}

export async function fetchOrder(id: string): Promise<OrderDetail> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*, order_item_customizations(*)), payments(*), order_status_history(*), customers(created_at, notes)')
    .eq('id', id)
    .single();
  if (error) throw error;
  const o = data as OrderDetail;
  o.order_items.sort((a, b) => (a as never as { sort_order: number }).sort_order - (b as never as { sort_order: number }).sort_order);
  o.order_status_history.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return o;
}

export async function customerOrderCount(customerId: string): Promise<number> {
  const { count, error } = await supabase.from('orders').select('id', { count: 'exact', head: true }).eq('customer_id', customerId).neq('status', 'cancelled');
  if (error) throw error;
  return count ?? 0;
}

export async function recordPayment(orderId: string, amount?: number, reference?: string): Promise<void> {
  const { error } = await supabase.rpc('chef_record_payment', { p_order_id: orderId, p_amount: amount ?? null, p_reference: reference ?? null });
  if (error) throw error;
}

export async function markUnpaid(orderId: string): Promise<void> {
  const { error } = await supabase.rpc('chef_mark_unpaid', { p_order_id: orderId });
  if (error) throw error;
}

export async function setOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  const { error } = await supabase.rpc('chef_set_order_status', { p_order_id: orderId, p_status: status });
  if (error) throw error;
}

export async function notifyCustomer(orderId: string): Promise<number> {
  const { data, error } = await supabase.rpc('chef_notify_customer', { p_order_id: orderId });
  if (error) throw error;
  return data as number;
}

/** Re-run `onChange` whenever any order changes (Supabase Realtime). */
export function subscribeToOrders(onChange: () => void): () => void {
  const channel = supabase
    .channel(`chef-orders-${Math.random().toString(36).slice(2)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, onChange)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Customers, events, catering
// ---------------------------------------------------------------------------
export async function listCustomers(): Promise<CustomerDirectoryRow[]> {
  const { data, error } = await supabase.from('customer_directory').select('*').order('last_order_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data as CustomerDirectoryRow[];
}

export async function listEventMenus(): Promise<(Menu & { special_events: SpecialEvent | null })[]> {
  const { data, error } = await supabase
    .from('menus')
    .select('*, menu_entries(menu_item_id, sold_count), special_events(*)')
    .neq('type', 'weekly')
    .neq('status', 'archived')
    .order('pickup_date');
  if (error) throw error;
  return data as never;
}

export async function listCateringRequests(): Promise<CateringRequest[]> {
  const { data, error } = await supabase.from('catering_requests').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data as CateringRequest[];
}

export async function sendCateringQuote(id: string, amount: number, notes: string): Promise<void> {
  const { error } = await supabase
    .from('catering_requests')
    .update({ status: 'quoted', quote_amount: amount, quote_notes: notes, quoted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
