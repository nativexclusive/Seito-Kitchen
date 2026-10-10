import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { fetchMenu, placeOrder } from '../api/public';
import { ErrorText } from '../components/BackendNotice';
import { Button, ChoiceTile, Divider, EmptyState, Field, FieldRow, Grid, Row, Screen, ScreenTitle, Segmented, Stepper, SummaryLine, T } from '../components/ui';
import { formatDate, money, num } from '../lib/format';
import { imageSource } from '../lib/images';
import { methodLabel } from '../lib/status';
import { errorMessage } from '../lib/supabase';
import type { Fulfillment, PaymentMethod } from '../lib/types';
import { useQuery } from '../lib/useQuery';
import { useCart } from '../state/cart';
import { useSettings } from '../state/settings';
import { colors, fonts, radius, shadow } from '../theme';

const ALL_METHODS: PaymentMethod[] = ['cash', 'zelle', 'cashapp', 'card'];

export default function CartScreen() {
  const cart = useCart();
  const { settings } = useSettings();
  const menu = useQuery(() => (cart.menuId ? fetchMenu({ id: cart.menuId }) : Promise.resolve(null)), [cart.menuId]);

  const [contact, setContact] = useState(cart.contact);
  const [mode, setMode] = useState<Fulfillment>('pickup');
  const [slot, setSlot] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [pay, setPay] = useState<PaymentMethod>('zelle');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cart.ready) setContact(cart.contact);
  }, [cart.ready]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!settings.payment_methods.includes(pay) && settings.payment_methods.length) setPay(settings.payment_methods[0]);
  }, [settings.payment_methods]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosenSlot = slot ?? settings.pickup_slots[0];
  const fee = mode === 'delivery' ? num(settings.delivery_fee) : 0;
  const tax = Math.round(cart.subtotal * num(settings.tax_rate) * 100) / 100;
  const total = cart.subtotal + fee + tax;
  const pickupDate = menu.data ? formatDate(menu.data.pickup_date) : '';

  const payNote: Record<PaymentMethod, string> = {
    cash: 'Pay cash at pickup. Your order shows Payment Pending until Mama confirms she received it.',
    zelle: `Send ${money(total)} by Zelle to ${settings.zelle_contact ?? 'Mama'} with your order number. It stays Payment Pending until Mama confirms receipt.`,
    cashapp: `Send ${money(total)} to ${settings.cashtag ?? 'Mama'} with your order number. It stays Payment Pending until Mama confirms receipt.`,
    card: 'Card and Apple Pay checkout is coming soon. Please choose another payment method for now.',
  };

  const submit = async () => {
    setError(null);
    if (!cart.menuId) return;
    if (!contact.name.trim()) return setError('Please enter your name.');
    if (contact.phone.replace(/\D/g, '').length < 10) return setError('Please enter a phone number so Mama can reach you.');
    if (mode === 'delivery' && !address.trim()) return setError('Please enter your delivery address.');
    if (!settings.payment_methods.includes(pay)) return setError('Please choose a payment method.');
    setSubmitting(true);
    cart.setContact(contact);
    try {
      const res = await placeOrder({
        client_request_id: cart.requestId,
        menu_id: cart.menuId,
        customer: { name: contact.name.trim(), phone: contact.phone, email: contact.email.trim() || undefined },
        fulfillment: mode,
        pickup_slot: mode === 'pickup' ? chosenSlot : undefined,
        delivery_address: mode === 'delivery' ? address.trim() : undefined,
        notes: notes.trim() || undefined,
        payment_method: pay,
        items: cart.lines.map((l) => ({
          menu_item_id: l.menuItemId,
          quantity: l.quantity,
          option_value_ids: l.optionValueIds,
          instructions: l.instructions || undefined,
        })),
      });
      cart.completeOrder({ token: res.tracking_token, orderNumber: res.order_number, placedAt: new Date().toISOString() });
      router.replace({ pathname: '/confirm/[token]', params: { token: res.tracking_token } });
    } catch (e) {
      setError(errorMessage(e));
      menu.reload(); // refresh stock in case something sold out
    } finally {
      setSubmitting(false);
    }
  };

  const empty = cart.lines.length === 0;

  return (
    <Screen
      gap={20}
      footer={
        empty ? undefined : (
          <Button label={`Place Order · ${money(total)}`} height={56} weight={800} rounded={16} loading={submitting} onPress={submit} />
        )
      }
    >
      <ScreenTitle title="Your Order" fallback="/menu" />

      {empty ? (
        <EmptyState title="Your order is empty" action={<Button label="Browse the Menu" height={46} size={14} rounded={12} onPress={() => router.replace('/menu')} />} />
      ) : (
        <>
          <View style={{ gap: 10 }}>
            {cart.lines.map((l) => {
              const img = imageSource(l.imageUrl);
              return (
                <View key={l.key} style={[{ flexDirection: 'row', gap: 12, padding: 12, borderRadius: 16, backgroundColor: '#FFFFFF' }, shadow.card]}>
                  {img ? (
                    <Image source={img} accessibilityLabel={l.name} contentFit="cover" style={{ width: 64, height: 64, borderRadius: 12 }} />
                  ) : (
                    <View style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: colors.placeholderImg }} />
                  )}
                  <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <T size={15} weight={700} style={{ flex: 1 }}>
                        {l.name}
                      </T>
                      <T weight={700}>{money(l.unitPrice * l.quantity)}</T>
                    </Row>
                    <T size={12} color={colors.muted}>
                      {l.desc}
                      {l.instructions ? ` · "${l.instructions}"` : ''}
                    </T>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Stepper size="small" value={l.quantity} onChange={(n) => cart.setQuantity(l.key, n)} max={50} />
                      <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${l.name}`} onPress={() => cart.remove(l.key)} style={{ height: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
                        <T size={13} weight={600} color={colors.removeText}>
                          Remove
                        </T>
                      </Pressable>
                    </Row>
                  </View>
                </View>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/menu', params: cart.menuId ? { id: cart.menuId } : {} })} style={{ alignSelf: 'flex-start', height: 36, justifyContent: 'center' }}>
              <T size={14} weight={700} color={colors.forest}>
                + Add more dishes
              </T>
            </Pressable>
          </View>

          <View style={{ gap: 10 }}>
            <T size={17} weight={800} accessibilityRole="header">
              Your details
            </T>
            <Field label="Full name" value={contact.name} onChangeText={(name) => setContact({ ...contact, name })} autoComplete="name" textContentType="name" />
            <FieldRow>
              <Field label="Phone" value={contact.phone} onChangeText={(phone) => setContact({ ...contact, phone })} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" placeholder="(202) 555-0134" />
              <Field label="Email" value={contact.email} onChangeText={(email) => setContact({ ...contact, email })} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@email.com" />
            </FieldRow>
          </View>

          <View style={{ gap: 10 }}>
            <T size={17} weight={800} accessibilityRole="header">
              {settings.delivery_enabled ? 'Pickup or delivery' : 'Pickup'}
            </T>
            {settings.delivery_enabled ? (
              <Segmented options={[{ key: 'pickup', label: 'Pickup' }, { key: 'delivery', label: 'Delivery' }]} value={mode} onChange={setMode} />
            ) : null}
            {mode === 'pickup' ? (
              <>
                {settings.pickup_slots.length ? (
                  <>
                    <T size={13} weight={600}>
                      Pickup time{pickupDate ? ` · ${pickupDate}` : ''}
                    </T>
                    <View style={{ gap: 8 }} accessibilityRole="radiogroup">
                      {settings.pickup_slots.map((s) => (
                        <ChoiceTile key={s} label={s} height={46} selected={chosenSlot === s} onPress={() => setSlot(s)} />
                      ))}
                    </View>
                  </>
                ) : null}
                {settings.pickup_address ? (
                  <T size={12} color={colors.muted}>
                    Pickup at {settings.pickup_address}
                  </T>
                ) : null}
              </>
            ) : (
              <>
                <Field label="Delivery address" value={address} onChangeText={setAddress} placeholder="Street, city, ZIP" autoComplete="street-address" />
                <T size={12} color={colors.muted}>
                  Delivery fee: {money(settings.delivery_fee)}
                </T>
              </>
            )}
            <Field label="Order notes (optional)" value={notes} onChangeText={setNotes} placeholder="Anything Mama should know" maxLength={500} />
          </View>

          <View style={{ gap: 10 }}>
            <T size={17} weight={800} accessibilityRole="header">
              Payment method
            </T>
            <Grid gap={8}>
              {ALL_METHODS.filter((m) => m === 'card' || settings.payment_methods.includes(m)).map((m) => {
                const enabled = settings.payment_methods.includes(m);
                return (
                  <View key={m} style={{ opacity: enabled ? 1 : 0.5 }}>
                    <ChoiceTile label={methodLabel[m]} detail={enabled ? undefined : 'Coming soon'} selected={pay === m} onPress={() => enabled && setPay(m)} />
                  </View>
                );
              })}
            </Grid>
            <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#FDEBC8' }}>
              <T size={13} color="#3D2A00" lineHeight={1.5}>
                {payNote[pay]}
              </T>
            </View>
          </View>

          <View style={{ gap: 8, padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF' }}>
            <SummaryLine label="Subtotal" value={money(cart.subtotal)} />
            {mode === 'delivery' ? <SummaryLine label="Delivery" value={money(fee)} /> : null}
            <SummaryLine label="Tax" value={money(tax)} />
            <Divider />
            <SummaryLine label="Total" value={money(total)} strong />
          </View>
          <ErrorText message={error} />
          <T size={12} color={colors.muted} align="center" style={{ fontFamily: fonts[400] }}>
            Prices are confirmed by Mama's Kitchen when you place your order.
          </T>
        </>
      )}
    </Screen>
  );
}
