import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { fetchPublishedEvents, submitCateringRequest } from '../api/public';
import { BackendNotice, ErrorText } from '../components/BackendNotice';
import { Button, Field, FieldRow, Notice, Screen, ScreenTitle, Segmented, T } from '../components/ui';
import { formatDate, formatDeadline } from '../lib/format';
import { holidayImage, imageSource } from '../lib/images';
import { errorMessage, isSupabaseConfigured } from '../lib/supabase';
import { useQuery } from '../lib/useQuery';
import { useCart } from '../state/cart';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

const EVENT_TYPES = ['Birthday', 'Graduation', 'Family Reunion', 'Other'] as const;

export default function CustomerEvents() {
  const { settings } = useSettings();
  const cart = useCart();
  const events = useQuery(() => (isSupabaseConfigured ? fetchPublishedEvents() : Promise.resolve([])));

  const [type, setType] = useState<(typeof EVENT_TYPES)[number]>('Birthday');
  const [name, setName] = useState(cart.contact.name);
  const [phone, setPhone] = useState(cart.contact.phone);
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    if (!name.trim() || phone.replace(/\D/g, '').length < 10) return setError('Please enter your name and phone number so Mama can send your quote.');
    setBusy(true);
    try {
      await submitCateringRequest({
        customer_name: name.trim(),
        phone: phone.replace(/\D/g, ''),
        event_type: type,
        event_date: date.trim() || undefined,
        guest_count: Number.parseInt(guests, 10) || undefined,
        notes: notes.trim() || undefined,
      });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScreenTitle title="Special Events" />
      <BackendNotice />
      <ErrorText message={events.error} />
      {(events.data ?? []).map((ev) => {
        const img = imageSource(ev.banner_image_url) ?? holidayImage;
        const orderable = ev.menu_id && ev.menus?.status === 'published';
        return (
          <View key={ev.id} style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: colors.forest, minHeight: 180 }}>
              <View style={{ flex: 1, padding: 18, gap: 8 }}>
                <View style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.gold }}>
                  <T size={11} weight={800} style={{ letterSpacing: 0.7 }}>
                    HOLIDAY
                  </T>
                </View>
                <T size={21} weight={800} color={colors.cream}>
                  {ev.name}
                </T>
                <T size={13} color={colors.onForestMuted} lineHeight={1.5}>
                  {ev.description}
                </T>
                <T size={13} weight={700} color={colors.gold} style={{ marginTop: 'auto' }}>
                  {formatDate(ev.event_date, 'short')}
                  {ev.order_deadline ? ` · Order by ${formatDeadline(ev.order_deadline, settings.timezone, 'short')}` : ''}
                </T>
              </View>
              <Image source={img} accessibilityLabel={`${ev.name} platter`} contentFit="cover" style={{ width: 120 }} />
            </View>
            {orderable ? (
              <Button label={`View ${ev.name} Menu`} height={50} size={15} onPress={() => router.push({ pathname: '/menu', params: { id: ev.menu_id! } })} />
            ) : (
              <T size={13} color={colors.muted} align="center">
                The menu for this event opens soon.
              </T>
            )}
          </View>
        );
      })}

      <T size={18} weight={800} style={{ marginTop: 8 }} accessibilityRole="header">
        Request catering
      </T>
      <T size={13} color={colors.muted} style={{ marginTop: -8 }}>
        Birthdays, graduations, reunions — Mama will send you a quote.
      </T>
      {sent ? (
        <Notice>Request sent! Mama will review it and send you a quote to approve.</Notice>
      ) : (
        <View style={{ gap: 10 }}>
          <T size={13} weight={600}>
            Event type
          </T>
          <Segmented scroll options={EVENT_TYPES.map((t) => ({ key: t, label: t }))} value={type} onChange={setType} />
          <FieldRow>
            <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" />
            <Field label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" />
          </FieldRow>
          <FieldRow>
            <Field label="Date" value={date} onChangeText={setDate} placeholder="Sat, Nov 7" />
            <Field label="Guests" value={guests} onChangeText={setGuests} keyboardType="number-pad" placeholder="60" />
          </FieldRow>
          <Field label="Dishes, budget, anything else" value={notes} onChangeText={setNotes} multiline maxLength={1000} />
          <ErrorText message={error} />
          <Button label="Send Request" variant="forest" height={50} size={15} loading={busy} onPress={send} />
        </View>
      )}
    </Screen>
  );
}
