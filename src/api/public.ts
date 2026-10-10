import { supabase } from '../lib/supabase';
import type { BusinessSettings, Menu, NotifyPrefs, PaymentMethod, Fulfillment, SpecialEvent, TrackedOrder } from '../lib/types';

export const MENU_SELECT = '*, menu_entries(*, menu_items(*, item_options(*, item_option_values(*))))';

function sortMenu(menu: Menu): Menu {
  menu.menu_entries.sort((a, b) => a.sort_order - b.sort_order || a.menu_items.sort_order - b.menu_items.sort_order);
  for (const e of menu.menu_entries) {
    e.menu_items.item_options.sort((a, b) => a.sort_order - b.sort_order);
    for (const o of e.menu_items.item_options) o.item_option_values.sort((a, b) => a.sort_order - b.sort_order);
  }
  return menu;
}

export async function fetchSettings(): Promise<BusinessSettings> {
  const { data, error } = await supabase.from('business_settings').select('*').eq('id', 1).single();
  if (error) throw error;
  return data as BusinessSettings;
}

/** The published weekly menu customers should see now: the next upcoming pickup. */
export async function fetchCurrentMenu(): Promise<Menu | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('menus')
    .select(MENU_SELECT)
    .eq('status', 'published')
    .eq('type', 'weekly')
    .gte('pickup_date', today)
    .order('pickup_date', { ascending: true })
    .limit(1);
  if (error) throw error;
  const menu = (data?.[0] as Menu | undefined) ?? null;
  // Hidden dishes are filtered by RLS, which leaves their entry with a null dish.
  if (menu) menu.menu_entries = menu.menu_entries.filter((e) => e.menu_items);
  return menu ? sortMenu(menu) : null;
}

export async function fetchMenu(idOrSlug: { id?: string; slug?: string }): Promise<Menu | null> {
  let q = supabase.from('menus').select(MENU_SELECT);
  q = idOrSlug.id ? q.eq('id', idOrSlug.id) : q.eq('share_slug', idOrSlug.slug ?? '');
  const { data, error } = await q.maybeSingle();
  if (error) throw error;
  const menu = data as Menu | null;
  if (menu) menu.menu_entries = menu.menu_entries.filter((e) => e.menu_items);
  return menu ? sortMenu(menu) : null;
}

export async function fetchPublishedEvents(): Promise<(SpecialEvent & { menus: { status: string } | null })[]> {
  const { data, error } = await supabase
    .from('special_events')
    .select('*, menus(status)')
    .eq('is_published', true)
    .gte('event_date', new Date().toISOString().slice(0, 10))
    .order('event_date');
  if (error) throw error;
  return data as never;
}

export interface PlaceOrderInput {
  client_request_id: string;
  menu_id: string;
  customer: { name: string; phone: string; email?: string };
  fulfillment: Fulfillment;
  pickup_slot?: string;
  delivery_address?: string;
  notes?: string;
  payment_method: PaymentMethod;
  items: { menu_item_id: string; quantity: number; option_value_ids: string[]; instructions?: string }[];
}

export async function placeOrder(input: PlaceOrderInput): Promise<{ order_id: string; order_number: number; tracking_token: string }> {
  const { data, error } = await supabase.rpc('place_order', { p: input });
  if (error) throw error;
  return data;
}

export async function fetchTrackedOrder(token: string): Promise<TrackedOrder | null> {
  const { data, error } = await supabase.rpc('get_order_by_token', { p_token: token });
  if (error) throw error;
  return data as TrackedOrder | null;
}

export async function saveNotifyPrefs(token: string, prefs: Partial<NotifyPrefs>): Promise<void> {
  const { error } = await supabase.rpc('set_notification_prefs_by_token', { p_token: token, p_prefs: prefs });
  if (error) throw error;
}

export async function submitCateringRequest(input: {
  customer_name: string;
  phone?: string;
  email?: string;
  event_date?: string;
  event_type: string;
  guest_count?: number;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from('catering_requests').insert(input);
  if (error) throw error;
}
