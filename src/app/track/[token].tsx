import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { RefreshControl, View } from 'react-native';

import { fetchTrackedOrder, saveNotifyPrefs } from '../../api/public';
import { ErrorText } from '../../components/BackendNotice';
import { CheckIcon, LogoMark } from '../../components/icons';
import { Badge, Loading, Row, Screen, ScreenTitle, T, Toggle } from '../../components/ui';
import { formatWhen, money } from '../../lib/format';
import { fulfillmentLine } from '../../lib/orderText';
import { customerPaymentLabel, customerPaymentTone, customerStatusLabel, ORDER_STEPS } from '../../lib/status';
import { errorMessage } from '../../lib/supabase';
import type { NotifyPrefs, TrackedOrder } from '../../lib/types';
import { useQuery } from '../../lib/useQuery';
import { useSettings } from '../../state/settings';
import { colors } from '../../theme';

const PREF_ROWS: [keyof NotifyPrefs, string][] = [
  ['push', 'Push notifications'],
  ['email', 'Email'],
  ['sms', 'Text message (SMS)'],
  ['new_menus', 'New Thursday menus'],
  ['holiday_menus', 'Holiday & event menus'],
];

function statusMessage(o: TrackedOrder): string | null {
  switch (o.status) {
    case 'confirmed':
      return `Your order #${o.order_number} is confirmed.`;
    case 'preparing':
      return `Mama has started cooking your order #${o.order_number}!`;
    case 'ready':
      return `Your Mama's Kitchen order #${o.order_number} is ready for pickup! Thank you for supporting us.`;
    default:
      return null;
  }
}

export default function TrackScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const { settings } = useSettings();
  // Poll while the screen is open so status changes from the chef show up.
  const q = useQuery(() => fetchTrackedOrder(token), [token], { pollMs: 20_000 });
  const o = q.data;

  const [prefs, setPrefs] = useState<NotifyPrefs | null>(null);
  const [prefError, setPrefError] = useState<string | null>(null);
  useEffect(() => {
    if (o?.notify && !prefs) setPrefs(o.notify);
  }, [o?.notify]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePref = async (key: keyof NotifyPrefs, value: boolean) => {
    if (!prefs) return;
    const prev = prefs;
    setPrefs({ ...prefs, [key]: value });
    setPrefError(null);
    try {
      await saveNotifyPrefs(token, { [key]: value });
    } catch (e) {
      setPrefs(prev);
      setPrefError(errorMessage(e));
    }
  };

  const idx = o ? ORDER_STEPS.indexOf(o.status) : -1;
  const notice = o ? statusMessage(o) : null;

  return (
    <Screen refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
      <ScreenTitle title="My Order" />
      {!o ? (
        q.loading ? <Loading /> : <ErrorText message={q.error ?? 'We could not find this order.'} />
      ) : (
        <>
          {notice ? (
            <View accessibilityRole="alert" style={{ flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.text, boxShadow: '0 10px 30px rgba(36, 36, 36, 0.25)' }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
                <LogoMark size={24} strokeWidth={3} />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <T size={12} weight={700} color={colors.cream}>
                  {settings.business_name}
                </T>
                <T size={13} color="#E8E1D5" lineHeight={1.45}>
                  {notice}
                </T>
              </View>
            </View>
          ) : null}

          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ gap: 2, flex: 1 }}>
              <T size={20} weight={800}>
                Order #{o.order_number}
              </T>
              <T size={13} color={colors.muted}>
                {fulfillmentLine(o)}
              </T>
            </View>
            <Badge label={customerPaymentLabel(o.payment_status)} tone={customerPaymentTone(o.payment_status)} />
          </Row>

          {o.payment_status !== 'paid' && o.status !== 'cancelled' ? (
            <T size={13} color={colors.muted} lineHeight={1.5}>
              Balance due: {money(o.total - o.amount_received)} by {o.payment_method === 'cashapp' ? 'Cash App' : o.payment_method === 'zelle' ? 'Zelle' : o.payment_method === 'cash' ? 'cash at pickup' : 'card'}.
              Mama marks it paid once she sees it.
            </T>
          ) : null}

          {o.status === 'cancelled' ? (
            <View style={{ padding: 14, borderRadius: 14, backgroundColor: '#FDE3E2' }}>
              <T weight={600} color={colors.dangerDeep}>
                This order was cancelled. Questions? Contact {settings.business_name}
                {settings.contact_phone ? ` at ${settings.contact_phone}` : ''}.
              </T>
            </View>
          ) : (
            <View accessibilityLabel="Order status" style={{ padding: 18, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
              {ORDER_STEPS.map((step, i) => {
                const done = i < idx || (i === idx && step === 'completed');
                const cur = i === idx && !done;
                const at = o.status_times[step];
                return (
                  <View key={step} style={{ flexDirection: 'row', gap: 14 }} accessibilityLabel={`${customerStatusLabel[step]}${done ? ', done' : cur ? ', current status' : ''}`}>
                    <View style={{ alignItems: 'center' }}>
                      <View
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 999,
                          backgroundColor: done ? colors.forest : cur ? colors.gold : '#FFFFFF',
                          borderWidth: done ? 0 : cur ? 5 : 2,
                          borderColor: cur ? '#FDEBC8' : '#CFC3AF',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {done ? <CheckIcon /> : null}
                      </View>
                      {i < ORDER_STEPS.length - 1 ? <View style={{ width: 2, height: 28, backgroundColor: i < idx ? colors.forest : colors.inputBorder }} /> : null}
                    </View>
                    <View style={{ gap: 2, paddingTop: 2 }}>
                      <T size={14} weight={cur ? 800 : done ? 700 : 500} color={done || cur ? colors.text : colors.muted}>
                        {customerStatusLabel[step]}
                      </T>
                      <T size={12} color={colors.muted}>
                        {cur ? 'Current status' : done ? (at ? formatWhen(at, settings.timezone) : 'Done') : ''}
                      </T>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {prefs ? (
            <View style={{ paddingVertical: 16, paddingHorizontal: 18, borderRadius: 18, backgroundColor: '#FFFFFF' }}>
              <T size={16} weight={800} style={{ marginBottom: 4 }}>
                Notify me by
              </T>
              {PREF_ROWS.map(([key, label]) => (
                <Row key={key} style={{ justifyContent: 'space-between', minHeight: 48, borderTopWidth: 1, borderTopColor: colors.hairline }}>
                  <T>{label}</T>
                  <Toggle label={label} value={prefs[key]} onChange={(v) => togglePref(key, v)} />
                </Row>
              ))}
              <ErrorText message={prefError} />
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}
