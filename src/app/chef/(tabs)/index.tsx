import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchFocusMenu, listOrders, subscribeToOrders } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { Button, Grid, Row, Screen, T } from '../../../components/ui';
import { formatDate, formatDeadline, initials, moneyShort, num } from '../../../lib/format';
import { prepReport } from '../../../lib/prep';
import { supabase } from '../../../lib/supabase';
import { useQuery } from '../../../lib/useQuery';
import { useAuth } from '../../../state/auth';
import { useSettings } from '../../../state/settings';
import { colors, shadow, tones } from '../../../theme';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Dashboard() {
  const { settings } = useSettings();
  const { session } = useAuth();
  const q = useQuery(async () => {
    const menu = await fetchFocusMenu();
    const [orders, customers, me] = await Promise.all([
      menu ? listOrders(menu.id) : Promise.resolve([]),
      supabase.from('customers').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('display_name').eq('id', session?.user.id ?? '').maybeSingle(),
    ]);
    return { menu, orders, customerCount: customers.count ?? 0, name: (me.data?.display_name as string | undefined) ?? 'Mama' };
  });
  useEffect(() => subscribeToOrders(q.reload), [q.reload]);

  const d = q.data;
  const live = (d?.orders ?? []).filter((o) => o.status !== 'cancelled');
  const expected = live.reduce((t, o) => t + num(o.total), 0);
  const collected = live.reduce((t, o) => t + num(o.amount_received), 0);
  const paidCount = live.filter((o) => o.payment_status === 'paid').length;
  const preparing = live.filter((o) => o.status === 'preparing').length;
  const ready = live.filter((o) => o.status === 'ready').length;
  const prep = prepReport(live).dishes.slice(0, 6);
  const maxQty = Math.max(1, ...prep.map((p) => p.qty));
  const pct = expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const goOrders = (filter: string) => router.navigate({ pathname: '/chef/orders', params: { filter } });

  return (
    <Screen topColor={colors.forest} padded={false} gap={0} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
      <View style={{ backgroundColor: colors.forest, paddingTop: 6, paddingHorizontal: 20, paddingBottom: 64, gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T script size={30} color={colors.gold} style={{ lineHeight: 36 }}>
            {settings.business_name}
          </T>
          <View style={{ width: 40, height: 40, borderRadius: 999, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
            <T size={14} weight={800}>
              {initials(settings.business_name)}
            </T>
          </View>
        </Row>
        <View style={{ gap: 2 }}>
          <T size={13} color={colors.onForestSubtle}>
            {d?.menu ? `${formatDate(d.menu.pickup_date)} · Orders close ${formatDeadline(d.menu.order_deadline, settings.timezone, 'short')}` : 'No Saturday menu yet'}
          </T>
          <T size={25} weight={800} color={colors.cream} accessibilityRole="header">
            {greeting()}, {d?.name ?? 'Mama'}
          </T>
        </View>
      </View>

      <View style={{ marginTop: -48, paddingHorizontal: 16, paddingBottom: 20, gap: 14 }}>
        <ErrorText message={q.error} />
        <View style={[{ padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 14 }, shadow.raised]}>
          <Grid gap={14}>
            <Stat label="Saturday orders" value={String(live.length)} big />
            <Stat label="Expected revenue" value={moneyShort(expected)} big />
            <Stat label="Collected" value={moneyShort(collected)} color={colors.collected} />
            <Stat label="Outstanding" value={moneyShort(expected - collected)} color={colors.outstanding} />
          </Grid>
          <View
            accessibilityLabel={`${pct}% of expected revenue collected`}
            style={{ flexDirection: 'row', height: 10, borderRadius: 999, overflow: 'hidden', backgroundColor: live.length ? colors.unpaidBar : colors.track }}
          >
            <View style={{ width: `${pct}%`, backgroundColor: colors.success }} />
          </View>
          <Row style={{ justifyContent: 'space-between', marginTop: -8 }}>
            <T size={12} weight={600} color={colors.collected}>
              {paidCount} paid
            </T>
            <T size={12} weight={600} color={colors.outstanding}>
              {live.length - paidCount} unpaid
            </T>
          </Row>
        </View>

        <Grid columns={3} gap={10}>
          <CountTile n={preparing} label="Preparing" tone="preparing" onPress={() => goOrders('preparing')} />
          <CountTile n={ready} label="Ready" tone="pending" onPress={() => goOrders('ready')} />
          <CountTile n={d?.customerCount ?? 0} label="Customers" tone="new" onPress={() => router.navigate('/chef/customers')} />
        </Grid>

        <Button label="Send This Week's Menu" height={54} rounded={16} weight={800} onPress={() => router.navigate('/chef/menus')} />

        <T size={16} weight={800} style={{ marginTop: 4 }} accessibilityRole="header">
          Quick actions
        </T>
        <Grid gap={10}>
          <QuickAction label="Create Weekly Menu" onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: 'new', type: 'weekly' } })} />
          <QuickAction label="View Orders" onPress={() => router.navigate('/chef/orders')} />
          <QuickAction label="Manage Customers" onPress={() => router.navigate('/chef/customers')} />
          <QuickAction label="Create Special Event" onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: 'new', type: 'holiday' } })} />
        </Grid>

        <View style={{ padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={16} weight={800}>
              Saturday prep
            </T>
            {d?.menu ? (
              <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: '/chef/prep', params: { menu: d.menu!.id } })} hitSlop={10}>
                <T size={13} weight={700} color={colors.forest}>
                  Full report
                </T>
              </Pressable>
            ) : null}
          </Row>
          {prep.length === 0 ? (
            <T size={13} color={colors.muted}>
              No orders yet.
            </T>
          ) : (
            <View accessibilityLabel={'Portions to prepare: ' + prep.map((p) => `${p.name} ${p.qty}`).join(', ')} style={{ gap: 10 }}>
              {prep.map((p) => (
                <View key={p.name} style={{ gap: 4 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <T size={13} weight={600}>
                      {p.name}
                    </T>
                    <T size={13} weight={800}>
                      {p.qty}
                    </T>
                  </Row>
                  <View style={{ height: 10, borderRadius: 999, backgroundColor: colors.track }}>
                    <View style={{ width: `${(p.qty / maxQty) * 100}%`, height: 10, borderRadius: 999, backgroundColor: colors.forest }} />
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

function Stat({ label, value, big, color = colors.text }: { label: string; value: string; big?: boolean; color?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T size={12} weight={600} color={colors.muted}>
        {label}
      </T>
      <T size={big ? 27 : 21} weight={800} color={color}>
        {value}
      </T>
    </View>
  );
}

function CountTile({ n, label, tone, onPress }: { n: number; label: string; tone: keyof typeof tones; onPress: () => void }) {
  const t = tones[tone];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${n} ${label}`} onPress={onPress} style={{ padding: 12, borderRadius: 16, backgroundColor: t.bg, gap: 2 }}>
      <T size={22} weight={800} color={t.fg}>
        {n}
      </T>
      <T size={12} weight={600} color={t.fg}>
        {label}
      </T>
    </Pressable>
  );
}

function QuickAction({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ height: 64, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, opacity: pressed ? 0.85 : 1 })}
    >
      <T size={13} weight={700} align="center">
        {label}
      </T>
    </Pressable>
  );
}
