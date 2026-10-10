import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { customerOrderCount, fetchOrder, markUnpaid, notifyCustomer, recordPayment, setOrderStatus } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { BellIcon, PhoneIcon } from '../../../components/icons';
import { Badge, Button, Divider, Field, FieldRow, Grid, Loading, Notice, Row, Screen, ScreenTitle, T } from '../../../components/ui';
import { formatPhone, formatWhen, initials, money, num } from '../../../lib/format';
import { imageSource } from '../../../lib/images';
import { customizationText, fulfillmentLine } from '../../../lib/orderText';
import { chefStatusLabel, methodLabel, nextStep, paymentLabel, paymentTone, statusTone } from '../../../lib/status';
import { errorMessage } from '../../../lib/supabase';
import { useQuery } from '../../../lib/useQuery';
import { useSettings } from '../../../state/settings';
import { colors, radius } from '../../../theme';

type Confirming = null | 'cancel' | 'unpaid';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { settings } = useSettings();
  const q = useQuery(async () => {
    const order = await fetchOrder(id);
    const orderCount = await customerOrderCount(order.customer_id);
    return { order, orderCount };
  }, [id]);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirming>(null);
  const [partial, setPartial] = useState(false);
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');

  const act = async (key: string, fn: () => Promise<unknown>, done?: string): Promise<boolean> => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      setConfirming(null);
      await q.reload();
      if (done) {
        setToast(done);
        setTimeout(() => setToast(null), 2500);
      }
      return true;
    } catch (e) {
      setError(errorMessage(e));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const o = q.data?.order;
  if (!o) {
    return (
      <Screen>
        <ScreenTitle title="Order" fallback="/chef/orders" />
        {q.loading ? <Loading /> : <ErrorText message={q.error} />}
      </Screen>
    );
  }

  const balance = Math.max(0, num(o.total) - num(o.amount_received));
  const next = nextStep[o.status];
  const closed = o.status === 'cancelled' || o.status === 'completed';
  const lastPayment = o.payments.filter((p) => !p.voided_at && p.kind === 'payment').sort((a, b) => b.received_at.localeCompare(a.received_at))[0];
  const firstName = o.customer_name.split(' ')[0];
  const since = o.customers?.created_at ? new Date(o.customers.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;

  const submitPayment = async () => {
    const amt = partial && amount.trim() ? Number.parseFloat(amount) : undefined;
    if (amt !== undefined && (Number.isNaN(amt) || amt <= 0)) return setError('Enter the amount you received.');
    if (await act('pay', () => recordPayment(o.id, amt, reference.trim() || undefined), 'Payment recorded')) {
      setPartial(false);
      setAmount('');
      setReference('');
    }
  };

  return (
    <Screen gap={14} refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}>
      <ScreenTitle
        title={`Order #${o.order_number}`}
        size={21}
        fallback="/chef/orders"
        right={
          <Row gap={6}>
            <Badge label={chefStatusLabel[o.status]} tone={statusTone[o.status]} />
            <Badge label={paymentLabel[o.payment_status]} tone={paymentTone[o.payment_status]} />
          </Row>
        }
      />

      {/* Customer */}
      <View style={{ padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
        <Row gap={12}>
          <View style={{ width: 44, height: 44, borderRadius: 999, backgroundColor: '#E2ECE7', alignItems: 'center', justifyContent: 'center' }}>
            <T weight={800} color={colors.forest}>
              {initials(o.customer_name)}
            </T>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T size={15} weight={800}>
              {o.customer_name}
            </T>
            <T size={12} color={colors.muted}>
              {q.data!.orderCount} order{q.data!.orderCount === 1 ? '' : 's'}
              {since ? ` · customer since ${since}` : ''}
            </T>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Call ${o.customer_name}`}
            onPress={() => Linking.openURL(`tel:${o.customer_phone}`)}
            style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#F6F0E6', alignItems: 'center', justifyContent: 'center' }}
          >
            <PhoneIcon />
          </Pressable>
        </Row>
        <View style={{ gap: 4 }}>
          <T size={13} color={colors.secondary}>
            {formatPhone(o.customer_phone)}
            {o.customer_email ? ` · ${o.customer_email}` : ''}
          </T>
          <T size={13} color={colors.secondary}>
            {fulfillmentLine(o)}
          </T>
          {o.delivery_address ? (
            <T size={13} color={colors.secondary}>
              Deliver to: {o.delivery_address}
            </T>
          ) : null}
          {o.customers?.notes ? (
            <T size={13} weight={600} color={colors.forest}>
              Note: {o.customers.notes}
            </T>
          ) : null}
        </View>
      </View>

      {/* Items */}
      <View style={{ padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 12 }}>
        {o.order_items.map((l) => {
          const img = imageSource(l.image_url);
          const custom = customizationText([...l.order_item_customizations].sort((a, b) => a.sort_order - b.sort_order));
          return (
            <Row key={l.id} gap={12} style={{ alignItems: 'flex-start' }}>
              {img ? <Image source={img} accessibilityLabel={l.name} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 10 }} /> : <View style={{ width: 52, height: 52, borderRadius: 10, backgroundColor: colors.placeholderImg }} />}
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T weight={700} style={{ flex: 1 }}>
                    {l.quantity}× {l.name}
                  </T>
                  <T weight={700}>{money(l.line_total)}</T>
                </Row>
                {custom ? (
                  <T size={12} color={colors.muted}>
                    {custom}
                  </T>
                ) : null}
              </View>
            </Row>
          );
        })}
        {o.order_items
          .filter((l) => l.instructions)
          .map((l) => (
            <View key={`i-${l.id}`} style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FDEBC8' }}>
              <T size={13} color="#5C3D00">
                <T size={13} weight={700} color="#5C3D00">
                  {l.name}:
                </T>{' '}
                "{l.instructions}"
              </T>
            </View>
          ))}
        {o.notes ? (
          <View style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#FDEBC8' }}>
            <T size={13} color="#5C3D00">
              <T size={13} weight={700} color="#5C3D00">
                Order note:
              </T>{' '}
              "{o.notes}"
            </T>
          </View>
        ) : null}
        <Divider />
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={17} weight={800}>
            Total
          </T>
          <T size={17} weight={800}>
            {money(o.total)}
          </T>
        </Row>
      </View>

      {/* Payment */}
      <View style={{ padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 12 }}>
        <T size={15} weight={800}>
          Payment
        </T>
        <Grid gap={10}>
          <Info label="Method" value={methodLabel[o.payment_method]} />
          <Info label="Received" value={num(o.amount_received) > 0 ? `${money(o.amount_received)}${lastPayment ? ` · ${new Date(lastPayment.received_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}` : '$0.00'} />
          <Info label="Balance" value={money(balance)} />
          <Info label="Reference" value={lastPayment?.reference ?? '—'} />
        </Grid>
        {balance > 0 && o.status !== 'cancelled' ? (
          <>
            {partial ? (
              <FieldRow>
                <Field label="Amount received" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={balance.toFixed(2)} />
                <Field label="Reference (optional)" value={reference} onChangeText={setReference} placeholder="Zelle confirmation" />
              </FieldRow>
            ) : null}
            <Button
              variant="paid"
              height={54}
              weight={800}
              label={partial ? 'Record Payment' : `Mark as Paid · ${money(balance)}`}
              loading={busy === 'pay'}
              disabled={!!busy}
              onPress={submitPayment}
            />
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={12} color={colors.muted} style={{ flex: 1 }}>
                Only mark paid after you see the money in Zelle, Cash App or cash.
              </T>
              <Pressable accessibilityRole="button" onPress={() => setPartial(!partial)} hitSlop={8}>
                <T size={12} weight={700} color={colors.forest}>
                  {partial ? 'Full amount' : 'Partial / add reference'}
                </T>
              </Pressable>
            </Row>
          </>
        ) : null}
        {num(o.amount_received) > 0 ? (
          <Button label="Mark as Unpaid" variant="outline" height={48} size={14} disabled={!!busy} onPress={() => setConfirming('unpaid')} />
        ) : null}
        {confirming === 'unpaid' ? (
          <ConfirmBox
            text={`Undo the ${money(o.amount_received)} recorded for order #${o.order_number}?`}
            keepLabel="Keep Payment"
            yesLabel="Yes, Mark Unpaid"
            busy={busy === 'unpaid'}
            onKeep={() => setConfirming(null)}
            onYes={() => act('unpaid', () => markUnpaid(o.id), 'Marked unpaid')}
          />
        ) : null}
      </View>

      {/* Status actions */}
      {next ? <Button label={next.label} height={56} rounded={16} weight={800} loading={busy === 'next'} disabled={!!busy} onPress={() => act('next', () => setOrderStatus(o.id, next.to), `${chefStatusLabel[next.to]} · ${firstName} notified`)} /> : null}
      {!closed || o.status === 'completed' ? (
        <Grid gap={10}>
          <Button
            label="Notify Customer"
            variant="outlineForest"
            height={50}
            size={14}
            left={<BellIcon />}
            style={{ paddingHorizontal: 8 }}
            loading={busy === 'notify'}
            disabled={!!busy}
            onPress={() => act('notify', () => notifyCustomer(o.id), `${firstName} notified`)}
          />
          {!closed ? <Button label="Cancel Order" variant="outlineDanger" height={50} size={14} disabled={!!busy} onPress={() => setConfirming('cancel')} /> : null}
        </Grid>
      ) : null}
      {confirming === 'cancel' ? (
        <ConfirmBox
          text={`Cancel order #${o.order_number}? ${firstName} will be notified and the portions go back on the menu.`}
          keepLabel="Keep Order"
          yesLabel="Yes, Cancel"
          busy={busy === 'cancel'}
          onKeep={() => setConfirming(null)}
          onYes={() => act('cancel', () => setOrderStatus(o.id, 'cancelled'), 'Order cancelled')}
        />
      ) : null}
      <ErrorText message={error} />
      {toast ? <Notice>{toast}</Notice> : null}
      <T size={11} color={colors.muted}>
        Customer messages are queued for push, email and text based on their preferences. Delivery providers are not connected yet.
      </T>

      {/* Activity */}
      <View style={{ padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
        <T size={15} weight={800}>
          Activity
        </T>
        {o.order_status_history.map((e) => (
          <Row key={e.id} gap={10} style={{ alignItems: 'flex-start' }}>
            <View style={{ width: 8, height: 8, marginTop: 6, borderRadius: 999, backgroundColor: colors.forest }} />
            <T size={13} style={{ flex: 1 }}>
              {e.event}
            </T>
            <T size={13} color={colors.muted}>
              {formatWhen(e.created_at, settings.timezone)}
            </T>
          </Row>
        ))}
      </View>
    </Screen>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T size={13} color={colors.muted}>
        {label}
      </T>
      <T size={13} weight={700}>
        {value}
      </T>
    </View>
  );
}

function ConfirmBox({ text, keepLabel, yesLabel, busy, onKeep, onYes }: { text: string; keepLabel: string; yesLabel: string; busy: boolean; onKeep: () => void; onYes: () => void }) {
  return (
    <View accessibilityRole="alert" style={{ padding: 14, borderRadius: 14, backgroundColor: '#FDE3E2', gap: 10 }}>
      <T weight={700} color={colors.dangerDeep}>
        {text}
      </T>
      <Grid gap={8}>
        <Button label={keepLabel} variant="white" height={44} size={13} rounded={12} onPress={onKeep} />
        <Button label={yesLabel} variant="danger" height={44} size={13} rounded={12} loading={busy} onPress={onYes} />
      </Grid>
    </View>
  );
}
