import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

import { formatDate, formatDeadline, money } from './format';
import { entryPrice, isSoldOut } from './pricing';
import type { BusinessSettings, Menu } from './types';

export function menuLink(menu: Pick<Menu, 'share_slug'>, settings: Pick<BusinessSettings, 'public_site_url'>): string {
  const base =
    settings.public_site_url?.replace(/\/$/, '') ??
    (Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : Linking.createURL('').replace(/\/$/, ''));
  return `${base}/m/${menu.share_slug}`;
}

/** Plain-text menu preview for SMS / WhatsApp / email. */
export function menuMessage(menu: Menu, settings: BusinessSettings): string {
  const dishes = menu.menu_entries
    .filter((e) => e.menu_items && !isSoldOut(e))
    .map((e) => `• ${e.menu_items.name} — ${money(entryPrice(e))}`)
    .join('\n');
  return [
    `${settings.business_name} — ${menu.title}`,
    '',
    dishes,
    '',
    `Pickup ${formatDate(menu.pickup_date)}. Order by ${formatDeadline(menu.order_deadline, settings.timezone)}.`,
    `Order now: ${menuLink(menu, settings)}`,
  ].join('\n');
}

export type ShareChannel = 'sms' | 'whatsapp' | 'email' | 'copy';

export async function shareMenu(channel: ShareChannel, menu: Menu, settings: BusinessSettings): Promise<string | void> {
  const text = menuMessage(menu, settings);
  const body = encodeURIComponent(text);
  switch (channel) {
    case 'sms':
      await Linking.openURL(Platform.OS === 'ios' ? `sms:&body=${body}` : `sms:?body=${body}`);
      return;
    case 'whatsapp':
      await Linking.openURL(`https://wa.me/?text=${body}`);
      return;
    case 'email':
      await Linking.openURL(`mailto:?subject=${encodeURIComponent(`${settings.business_name}: ${menu.title}`)}&body=${body}`);
      return;
    case 'copy':
      await Clipboard.setStringAsync(menuLink(menu, settings));
      return 'Link copied';
  }
}
