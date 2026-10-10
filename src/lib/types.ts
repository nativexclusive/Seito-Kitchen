export type MenuType = 'weekly' | 'holiday' | 'event' | 'catering' | 'custom';
export type MenuStatus = 'draft' | 'published' | 'archived';
export type OrderStatus = 'received' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'zelle' | 'cashapp' | 'card';
export type Fulfillment = 'pickup' | 'delivery';

export interface BusinessSettings {
  business_name: string;
  tagline: string;
  timezone: string;
  pickup_address: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  zelle_contact: string | null;
  cashtag: string | null;
  payment_methods: PaymentMethod[];
  delivery_enabled: boolean;
  delivery_fee: number;
  tax_rate: number;
  pickup_slots: string[];
  public_site_url: string | null;
}

export interface OptionValue {
  id: string;
  label: string;
  price_delta: number;
  is_default: boolean;
  sort_order: number;
}

export interface ItemOption {
  id: string;
  name: string;
  kind: 'single' | 'multi';
  required: boolean;
  sort_order: number;
  item_option_values: OptionValue[];
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  base_price: number;
  is_hidden: boolean;
  sort_order: number;
  item_options: ItemOption[];
}

export interface MenuEntry {
  menu_id: string;
  menu_item_id: string;
  max_quantity: number | null;
  sold_count: number;
  sold_out: boolean;
  price_override: number | null;
  sort_order: number;
  menu_items: MenuItem;
}

export interface Menu {
  id: string;
  type: MenuType;
  title: string;
  description: string;
  cover_image_url: string | null;
  pickup_date: string; // yyyy-mm-dd
  order_deadline: string; // ISO timestamp
  status: MenuStatus;
  accepting_orders: boolean;
  share_slug: string;
  published_at: string | null;
  menu_entries: MenuEntry[];
}

export interface OrderRow {
  id: string;
  order_number: number;
  menu_id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  fulfillment: Fulfillment;
  pickup_date: string;
  pickup_slot: string | null;
  delivery_address: string | null;
  notes: string | null;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_received: number;
  status: OrderStatus;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  name: string;
  image_url: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
  instructions: string | null;
  menu_item_id: string | null;
  order_item_customizations: { option_name: string; value_label: string; price_delta: number; sort_order: number }[];
}

export interface PaymentRow {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string | null;
  received_at: string;
  voided_at: string | null;
  kind: 'payment' | 'refund';
}

export interface HistoryRow {
  id: number;
  event: string;
  created_at: string;
}

export interface NotifyPrefs {
  push: boolean;
  email: boolean;
  sms: boolean;
  new_menus: boolean;
  holiday_menus: boolean;
}

/** Shape returned by get_order_by_token(). */
export interface TrackedOrder {
  id: string;
  order_number: number;
  tracking_token: string;
  customer_name: string;
  fulfillment: Fulfillment;
  pickup_date: string;
  pickup_slot: string | null;
  delivery_address: string | null;
  subtotal: number;
  delivery_fee: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_received: number;
  status: OrderStatus;
  created_at: string;
  menu_title: string;
  items: {
    name: string;
    image_url: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
    instructions: string | null;
    customizations: { option_name: string; value_label: string; price_delta: number }[];
  }[];
  status_times: Partial<Record<OrderStatus, string>>;
  notify: NotifyPrefs | null;
}

export interface CustomerDirectoryRow {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  marketing_opt_in: boolean;
  order_count: number;
  total_spent: number;
  unpaid_balance: number;
  last_order_at: string | null;
  favorite_dish: string | null;
}

export interface CateringRequest {
  id: string;
  customer_name: string;
  phone: string | null;
  email: string | null;
  event_date: string | null;
  event_type: string;
  guest_count: number | null;
  requested_dishes: string | null;
  budget: string | null;
  notes: string | null;
  status: 'new' | 'quoted' | 'accepted' | 'declined';
  quote_amount: number | null;
  created_at: string;
}

export interface SpecialEvent {
  id: string;
  menu_id: string | null;
  name: string;
  banner_image_url: string | null;
  description: string;
  event_date: string;
  order_deadline: string | null;
  max_capacity: number | null;
  is_published: boolean;
}
