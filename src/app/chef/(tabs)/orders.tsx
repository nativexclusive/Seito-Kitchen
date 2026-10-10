import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { fetchFocusMenu, listOrders, subscribeToOrders, type OrderListRow } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { SearchIcon } from '../../../components/icons';
import { Badge, Loading, Row, Screen, T } from '../../../components/ui';
import { formatDate, formatPhone, itemCount, money } from '../../../lib/format';
import { chefStatusLabel, paymentLabel, paymentTone, statusTone } from '../../../lib/status';
import { useQuery } from '../../../lib/useQuery';
import { colors, fonts } from '../../../theme';

type FilterKey = 'all' | 'new' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'paid' | 'unpaid' | 'cancelled';

const FILTERS: { key: FilterKey; label: string; test: (o: OrderListRow) => boolean }[] = [
  { key: 'all', label: 'All', test: (o) => o.status !== 'cancelled' },
  { key: 'new', label: 'New', test: (o) => o.status === 'received' },
  { key: 'confirmed', label: 'Confirmed', test: (o) => o.status === 'confirmed' },
  { key: 'preparing', label: 'Preparing', test: (o) => o.status === 'preparing' },
  { key: 'ready', label: 'Ready', test: (o) => o.status === 'ready' },
  { key: 'completed', label: 'Completed', test: (o) => o.status === 'completed' },
  { key: 'paid', label: 'Paid', test: (o) => o.status !== 'cancelled' && o.payment_status === 'paid' },
  { key: 'unpaid', label: 'Unpaid', test: (o) => o.status !== 'cancelled' && o.payment_status !== 'paid' },
  { key: 'cancelled', label: 'Cancelled', test: (o) => o.status === 'cancelled' },
];

function matches(o: OrderListRow, search: string): boolean {
  const s = search.trim().toLowerCase();
  if (!s) return true;
  const digits = s.replace(/\D/g, '');
  return (
    o.customer_name.toLowerCase().includes(s) ||
    String(o.order_number).includes(s.replace('#', '')) ||
    (digits.length >= 3 && o.customer_phone.includes(digits))
  );
}

export default function OrdersTab() {
  const params = useLocalSearchParams<{ filter?: FilterKey }>();
  const [filter, setFilter] = useState<FilterKey>(params.filter ?? 'all');
  const [search, setSearch] = useState('');
  const [allMenus, setAllMenus] = useState(false);

  useEffect(() => {
    if (params.filter) setFilter(params.filter);
  }, [params.filter]);

  const q = useQuery(async () => {
    const menu = allMenus ? null : await fetchFocusMenu();
    return { menu, orders: await listOrders(menu?.id) };
  }, [allMenus]);
  useEffect(() => subscribeToOrders(q.reload), [q.reload]);

  const orders = q.data?.orders ?? [];
  const searched = useMemo(() => orders.filter((o) => matches(o, search)), [orders, search]);
  const current = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const rows = searched.filter(current.test);

  return (
    <Screen gap={12} contentStyle={{ paddingTop: 4 }} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={24} weight={800} accessibilityRole="header">
          Orders
        </T>
        <Pressable accessibilityRole="button" onPress={() => setAllMenus(!allMenus)} hitSlop={8}>
          <T size={13} weight={600} color={colors.muted}>
            {allMenus ? 'All menus' : q.data?.menu ? formatDate(q.data.menu.pickup_date, 'short') : ''} ▾
          </T>
        </Pressable>
      </Row>

      <Row gap={10} style={{ height: 46, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.inputBorder }}>
        <SearchIcon />
        <TextInput
          accessibilityLabel="Search orders"
          value={search}
          onChangeText={setSearch}
          placeholder="Name, phone or order #"
          placeholderTextColor="#9A9083"
          style={{ flex: 1, height: 44, fontFamily: fonts[500], fontSize: 14, color: colors.text }}
        />
      </Row>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 2 }}>
        {FILTERS.map((f) => {
          const on = f.key === filter;
          return (
            <Pressable
              key={f.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => setFilter(f.key)}
              style={{ height: 38, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: on ? colors.gold : colors.inputBorder, backgroundColor: on ? colors.gold : '#FFFFFF', justifyContent: 'center' }}
            >
              <T size={13} weight={600}>
                {f.label} ({searched.filter(f.test).length})
              </T>
            </Pressable>
          );
        })}
      </ScrollView>

      <ErrorText message={q.error} />
      {q.loading && !q.data ? <Loading /> : null}

      {rows.map((o) => (
        <Pressable
          key={o.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/chef/order/[id]', params: { id: o.id } })}
          style={({ pressed }) => ({ gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, opacity: pressed ? 0.85 : 1 })}
        >
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={15} weight={800} style={{ flex: 1 }} numberOfLines={1}>
              #{o.order_number} · {o.customer_name}
            </T>
            <T size={15} weight={800}>
              {money(o.total)}
            </T>
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={12} color={colors.muted}>
              {formatPhone(o.customer_phone)}
            </T>
            <T size={12} color={colors.muted}>
              {itemCount(o.order_items.reduce((t, i) => t + i.quantity, 0))}
              {o.fulfillment === 'delivery' ? ' · Delivery' : o.pickup_slot ? ` · ${o.pickup_slot}` : ''}
            </T>
          </Row>
          <Row gap={6}>
            <Badge label={chefStatusLabel[o.status]} tone={statusTone[o.status]} />
            <Badge label={paymentLabel[o.payment_status]} tone={paymentTone[o.payment_status]} />
          </Row>
        </Pressable>
      ))}
      {!q.loading && rows.length === 0 ? (
        <View style={{ paddingVertical: 20 }}>
          <T color={colors.muted} align="center">
            {orders.length === 0 ? 'No orders yet.' : 'No orders match this filter.'}
          </T>
        </View>
      ) : null}
    </Screen>
  );
}
