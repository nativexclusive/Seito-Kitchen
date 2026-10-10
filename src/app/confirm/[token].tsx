import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { fetchTrackedOrder } from '../../api/public';
import { ErrorText } from '../../components/BackendNotice';
import { CheckIcon } from '../../components/icons';
import { Badge, Button, Divider, Loading, Row, Screen, T } from '../../components/ui';
import { money } from '../../lib/format';
import { customizationText, fulfillmentLine } from '../../lib/orderText';
import { customerPaymentTone, customerStatusLabel, methodLabel, statusTone } from '../../lib/status';
import { useQuery } from '../../lib/useQuery';
import { useSettings } from '../../state/settings';
import { colors, shadow, tones } from '../../theme';

export default function ConfirmScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { settings } = useSettings();
  const q = useQuery(() => fetchTrackedOrder(token), [token]);
  const o = q.data;

  const payText = !o
    ? ''
    : o.payment_status === 'paid'
      ? `Paid · ${methodLabel[o.payment_method]}`
      : o.payment_method === 'cash'
        ? `Payment Pending · Cash — pay ${money(o.total - o.amount_received)} at pickup.`
        : `Payment Pending · ${methodLabel[o.payment_method]} — send ${money(o.total - o.amount_received)} to ${
            o.payment_method === 'zelle' ? (settings.zelle_contact ?? 'Mama') : (settings.cashtag ?? 'Mama')
          } with order #${o.order_number}. Mama marks it paid once she sees it.`;

  return (
    <Screen topColor={colors.forest} padded={false} gap={0}>
      <View style={{ backgroundColor: colors.forest, paddingHorizontal: 28, paddingTop: 24, paddingBottom: 60, alignItems: 'center', gap: 10 }}>
        <View style={{ width: 72, height: 72, borderRadius: 999, borderWidth: 3, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
          <CheckIcon size={36} color={colors.gold} strokeWidth={2.6} />
        </View>
        <T size={24} weight={800} color={colors.cream} align="center" lineHeight={1.25} style={{ marginTop: 4 }} accessibilityRole="header">
          Thank You! Your Order Has Been Received.
        </T>
        <T size={14} color={colors.onForestMuted} align="center" lineHeight={1.5}>
          We'll notify you when Mama confirms it and when it's ready.
        </T>
      </View>

      <View style={[{ marginTop: -36, marginHorizontal: 16, padding: 18, borderRadius: 20, backgroundColor: '#FFFFFF', gap: 12 }, shadow.raised]}>
        {!o ? (
          q.loading ? <Loading /> : <ErrorText message={q.error ?? 'We could not load this order.'} />
        ) : (
          <>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={20} weight={800}>
                Order #{o.order_number}
              </T>
              <Badge label={customerStatusLabel[o.status]} tone={statusTone[o.status]} />
            </Row>
            <T size={13} color={colors.muted}>
              {o.customer_name}
            </T>
            {o.items.map((l, i) => (
              <View key={i} style={{ gap: 2 }}>
                <Row style={{ justifyContent: 'space-between', gap: 12 }}>
                  <T style={{ flex: 1 }}>
                    {l.quantity}× {l.name}
                  </T>
                  <T weight={600}>{money(l.line_total)}</T>
                </Row>
                {l.customizations.length || l.instructions ? (
                  <T size={12} color={colors.muted}>
                    {customizationText(l.customizations, l.instructions)}
                  </T>
                ) : null}
              </View>
            ))}
            <Divider />
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={18} weight={800}>
                Total
              </T>
              <T size={18} weight={800}>
                {money(o.total)}
              </T>
            </Row>
            <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: tones[customerPaymentTone(o.payment_status)].bg }}>
              <T size={13} weight={700} color={o.payment_status === 'paid' ? tones.paid.fg : '#5C3D00'} lineHeight={1.45}>
                {payText}
              </T>
            </View>
            <View style={{ gap: 2 }}>
              <T weight={700}>{fulfillmentLine(o)}</T>
              <T color={colors.muted}>{o.fulfillment === 'delivery' ? o.delivery_address : (settings.pickup_address ?? '')}</T>
            </View>
          </>
        )}
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 10 }}>
        <Button label="Track My Order" height={54} rounded={16} weight={800} onPress={() => router.replace({ pathname: '/track/[token]', params: { token } })} />
        <Button label="Back to Home" variant="outline" height={54} rounded={16} size={15} onPress={() => router.dismissTo('/')} />
      </View>
    </Screen>
  );
}
