import type { Menu } from './types';

export function menuIsOpen(menu: Pick<Menu, 'status' | 'accepting_orders' | 'order_deadline'>): boolean {
  return menu.status === 'published' && menu.accepting_orders && new Date(menu.order_deadline).getTime() > Date.now();
}

export function menuHeading(menu: Pick<Menu, 'type' | 'title'>): string {
  return menu.type === 'weekly' ? "This Saturday's Menu" : menu.title;
}
