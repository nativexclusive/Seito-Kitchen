import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, TextInput, View } from 'react-native';

import { listCustomers } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { SearchIcon } from '../../../components/icons';
import { Button, Loading, Row, Screen, T } from '../../../components/ui';
import { formatPhone, initials, moneyShort, num } from '../../../lib/format';
import type { CustomerDirectoryRow } from '../../../lib/types';
import { useQuery } from '../../../lib/useQuery';
import { colors, fonts, tones } from '../../../theme';

const AVATAR_TONES = [tones.new, tones.pending, tones.preparing, tones.neutral] as const;

function note(c: CustomerDirectoryRow): { text: string; color: string } {
  if (num(c.unpaid_balance) > 0) return { text: `${moneyShort(c.unpaid_balance)} unpaid`, color: colors.dangerText };
  if (c.notes) return { text: `Note: ${c.notes}`, color: colors.forest };
  if (!c.marketing_opt_in) return { text: 'Not subscribed to promotions', color: colors.muted };
  if (c.favorite_dish) return { text: `Usually orders ${c.favorite_dish}`, color: colors.forest };
  return { text: '', color: colors.muted };
}

export default function CustomersTab() {
  const q = useQuery(listCustomers);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const s = search.trim().toLowerCase();
  const digits = s.replace(/\D/g, '');
  const rows = (q.data ?? []).filter((c) => !s || c.name.toLowerCase().includes(s) || (digits.length >= 3 && c.phone.includes(digits)));
  const subscribed = (q.data ?? []).filter((c) => c.marketing_opt_in).length;

  return (
    <Screen gap={12} contentStyle={{ paddingTop: 4 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={24} weight={800} accessibilityRole="header">
          Customers
        </T>
        <T size={13} weight={600} color={colors.muted}>
          {q.data ? `${q.data.length} total` : ''}
        </T>
      </Row>
      <Row gap={10} style={{ height: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.inputBorder }}>
        <SearchIcon />
        <TextInput
          accessibilityLabel="Search customers"
          value={search}
          onChangeText={setSearch}
          placeholder="Search name or phone"
          placeholderTextColor="#9A9083"
          style={{ flex: 1, height: 44, fontFamily: fonts[500], fontSize: 14, color: colors.text }}
        />
      </Row>
      <ErrorText message={q.error} />
      {q.loading && !q.data ? <Loading /> : null}

      {rows.map((c, i) => {
        const t = AVATAR_TONES[i % AVATAR_TONES.length];
        const n = note(c);
        const expanded = open === c.id;
        return (
          <Pressable
            key={c.id}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setOpen(expanded ? null : c.id)}
            style={{ padding: 14, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 12 }}
          >
            <Row gap={12} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
                <T weight={800} color={t.fg}>
                  {initials(c.name)}
                </T>
              </View>
              <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T size={15} weight={800} style={{ flex: 1 }} numberOfLines={1}>
                    {c.name}
                  </T>
                  <T weight={800}>{moneyShort(c.total_spent)}</T>
                </Row>
                <T size={12} color={colors.muted}>
                  {formatPhone(c.phone)} · {c.order_count} order{Number(c.order_count) === 1 ? '' : 's'}
                  {Number(c.order_count) > 1 ? ' · returning' : ''}
                </T>
                {n.text ? (
                  <T size={12} weight={600} color={n.color}>
                    {n.text}
                  </T>
                ) : null}
              </View>
            </Row>
            {expanded ? (
              <View style={{ gap: 8 }}>
                {c.email ? (
                  <T size={12} color={colors.secondary}>
                    {c.email}
                  </T>
                ) : null}
                {c.last_order_at ? (
                  <T size={12} color={colors.secondary}>
                    Last order {new Date(c.last_order_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {c.favorite_dish ? ` · favorite: ${c.favorite_dish}` : ''}
                  </T>
                ) : null}
                <Row gap={8}>
                  <Button label="Call" variant="outlineForest" height={44} size={13} style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${c.phone}`)} />
                  <Button label="Text" variant="outlineForest" height={44} size={13} style={{ flex: 1 }} onPress={() => Linking.openURL(`sms:${c.phone}`)} />
                  {c.email ? <Button label="Email" variant="outlineForest" height={44} size={13} style={{ flex: 1 }} onPress={() => Linking.openURL(`mailto:${c.email}`)} /> : null}
                </Row>
              </View>
            ) : null}
          </Pressable>
        );
      })}

      <Button label={`Send Announcement to ${subscribed}`} height={54} rounded={16} weight={800} size={15} onPress={() => router.navigate('/chef/menus')} />
    </Screen>
  );
}
