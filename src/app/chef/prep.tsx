import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { fetchMenuForEdit, listOrders } from '../../api/chef';
import { ErrorText } from '../../components/BackendNotice';
import { Loading, Row, Screen, ScreenTitle, T } from '../../components/ui';
import { formatDate, money } from '../../lib/format';
import { prepReport } from '../../lib/prep';
import { useQuery } from '../../lib/useQuery';
import { colors, radius } from '../../theme';

/** Saturday preparation report for one menu. */
export default function PrepReport() {
  const { menu: menuId } = useLocalSearchParams<{ menu: string }>();
  const q = useQuery(async () => {
    const [menu, orders] = await Promise.all([fetchMenuForEdit(menuId), listOrders(menuId)]);
    return { menu, report: prepReport(orders) };
  }, [menuId]);

  const r = q.data?.report;
  const card = { padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 10 } as const;

  return (
    <Screen>
      <ScreenTitle title="Prep Report" fallback="/chef" />
      <ErrorText message={q.error} />
      {!r ? (
        q.loading ? <Loading /> : null
      ) : (
        <>
          <T size={14} weight={600} color={colors.forest} style={{ marginTop: -8 }}>
            {q.data!.menu.title} · {formatDate(q.data!.menu.pickup_date)} · {r.orderCount} orders
          </T>
          <View style={card}>
            <T size={16} weight={800}>
              Portions per dish
            </T>
            {r.dishes.length === 0 ? <T color={colors.muted}>No orders yet.</T> : null}
            {r.dishes.map((d) => (
              <View key={d.name} style={{ gap: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T weight={700}>{d.name}</T>
                  <T size={16} weight={800}>
                    {d.qty}
                  </T>
                </Row>
                {d.options.map((o) => (
                  <Row key={o.label} style={{ justifyContent: 'space-between', paddingLeft: 10 }}>
                    <T size={13} color={colors.secondary}>
                      {o.label}
                    </T>
                    <T size={13} weight={700} color={colors.secondary}>
                      {o.qty}
                    </T>
                  </Row>
                ))}
              </View>
            ))}
          </View>
          <View style={card}>
            <T size={16} weight={800}>
              Special instructions
            </T>
            {r.instructions.length === 0 ? <T color={colors.muted}>None.</T> : null}
            {r.instructions.map((i, n) => (
              <T key={n} size={13}>
                <T size={13} weight={700}>
                  #{i.orderNumber} {i.customer}
                </T>{' '}
                · {i.dish}: "{i.text}"
              </T>
            ))}
          </View>
          <View style={card}>
            <T size={16} weight={800}>
              Outstanding payments
            </T>
            {r.unpaid.length === 0 ? <T color={colors.muted}>Everyone has paid.</T> : null}
            {r.unpaid.map((u) => (
              <Row key={u.orderNumber} style={{ justifyContent: 'space-between' }}>
                <T size={13}>
                  #{u.orderNumber} {u.customer}
                </T>
                <T size={13} weight={700} color={colors.dangerText}>
                  {money(u.balance)}
                </T>
              </Row>
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}
