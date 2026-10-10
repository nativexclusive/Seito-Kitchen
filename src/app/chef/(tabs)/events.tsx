import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { listCateringRequests, listEventMenus, sendCateringQuote } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { Badge, Button, Field, FieldRow, Loading, Row, Screen, T } from '../../../components/ui';
import { formatDate, formatPhone, money } from '../../../lib/format';
import { holidayImage, imageSource } from '../../../lib/images';
import { errorMessage } from '../../../lib/supabase';
import type { CateringRequest } from '../../../lib/types';
import { useQuery } from '../../../lib/useQuery';
import { useSettings } from '../../../state/settings';
import { colors, radius } from '../../../theme';

export default function EventsTab() {
  const menus = useQuery(listEventMenus);
  const catering = useQuery(listCateringRequests);
  const featured = (menus.data ?? []).find((m) => m.status === 'published') ?? menus.data?.[0];
  const trays = featured?.menu_entries.reduce((t, e) => t + e.sold_count, 0) ?? 0;
  const cap = featured?.special_events?.max_capacity;

  return (
    <Screen
      contentStyle={{ paddingTop: 4 }}
      refreshControl={
        <RefreshControl
          refreshing={false}
          onRefresh={() => {
            menus.reload();
            catering.reload();
          }}
        />
      }
    >
      <T size={22} weight={800} accessibilityRole="header">
        Special Events
      </T>
      <ErrorText message={menus.error ?? catering.error} />
      {menus.loading && !menus.data ? <Loading /> : null}

      {featured ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: featured.id } })}
          style={{ flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: colors.forest, minHeight: 170 }}
        >
          <View style={{ flex: 1, padding: 18, gap: 8 }}>
            <View style={{ alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: colors.gold }}>
              <T size={11} weight={800}>
                {featured.type.toUpperCase()}
              </T>
            </View>
            <T size={21} weight={800} color={colors.cream}>
              {featured.title}
            </T>
            <T size={13} weight={700} color={colors.gold} style={{ marginTop: 'auto' }}>
              {formatDate(featured.pickup_date, 'short')} · {cap ? `${trays} of ${cap} trays` : `${trays} ordered`}
            </T>
          </View>
          <Image source={imageSource(featured.cover_image_url) ?? holidayImage} accessibilityLabel={`${featured.title} platter`} contentFit="cover" style={{ width: 120 }} />
        </Pressable>
      ) : null}

      <Button label="+ Create Holiday Menu" height={50} size={15} onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: 'new', type: 'holiday' } })} />

      <T size={16} weight={800} style={{ marginTop: 4 }}>
        Event menus
      </T>
      {(menus.data ?? []).length === 0 && !menus.loading ? (
        <T size={13} color={colors.muted}>
          No event menus yet.
        </T>
      ) : null}
      {(menus.data ?? []).map((m) => (
        <Pressable
          key={m.id}
          accessibilityRole="button"
          onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: m.id } })}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder }}
        >
          <View style={{ gap: 2, flex: 1 }}>
            <T weight={700}>{m.title}</T>
            <T size={12} color={colors.muted}>
              {new Date(m.pickup_date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            </T>
          </View>
          <Badge label={m.status === 'published' ? 'Active' : 'Draft'} tone={m.status === 'published' ? 'paid' : 'neutral'} />
        </Pressable>
      ))}

      <T size={16} weight={800} style={{ marginTop: 4 }}>
        Catering requests
      </T>
      {(catering.data ?? []).length === 0 && !catering.loading ? (
        <T size={13} color={colors.muted}>
          No catering requests yet. Customers can send one from Special Events.
        </T>
      ) : null}
      {(catering.data ?? []).map((r) => (
        <CateringCard key={r.id} request={r} onChange={catering.reload} />
      ))}
    </Screen>
  );
}

function CateringCard({ request: r, onChange }: { request: CateringRequest; onChange: () => void }) {
  const { settings } = useSettings();
  const [quoting, setQuoting] = useState(false);
  const [amount, setAmount] = useState(r.quote_amount ? String(r.quote_amount) : '');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = r.status === 'new';

  const textQuote = (amt: number) => {
    if (!r.phone) return;
    const msg = `Hi ${r.customer_name.split(' ')[0]}, this is ${settings.business_name}. Your quote for the ${r.event_type.toLowerCase()}${r.event_date ? ` on ${r.event_date}` : ''}${r.guest_count ? ` (${r.guest_count} guests)` : ''} is ${money(amt)}.${note ? ` ${note}` : ''} Reply YES to confirm.`;
    Linking.openURL(`sms:${r.phone}?body=${encodeURIComponent(msg)}`).catch(() => {});
  };

  const save = async () => {
    const amt = Number.parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0) return setError('Enter the quote amount.');
    setBusy(true);
    setError(null);
    try {
      await sendCateringQuote(r.id, amt, note);
      textQuote(amt);
      setQuoting(false);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ padding: 16, borderRadius: radius.card, backgroundColor: '#FFFFFF', borderWidth: isNew ? 1.5 : 1, borderColor: isNew ? colors.gold : colors.cardBorder, gap: 10 }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ gap: 2, flex: 1 }}>
          <T size={15} weight={700}>
            {r.event_type} · {r.customer_name}
          </T>
          <T size={12} color={colors.muted}>
            {[r.event_date, r.guest_count ? `${r.guest_count} guests` : null, r.phone ? formatPhone(r.phone) : r.email].filter(Boolean).join(' · ')}
          </T>
        </View>
        <Badge label={isNew ? 'New' : r.status === 'quoted' ? 'Quote sent' : r.status === 'accepted' ? 'Accepted' : 'Declined'} tone={isNew ? 'pending' : r.status === 'quoted' ? 'preparing' : r.status === 'accepted' ? 'paid' : 'neutral'} />
      </Row>
      {r.requested_dishes || r.notes || r.budget ? (
        <T size={13} color={colors.secondary}>
          {[r.requested_dishes, r.notes, r.budget ? `Budget: ${r.budget}` : null].filter(Boolean).join('. ')}
        </T>
      ) : null}
      {r.quote_amount ? (
        <T size={13} weight={700}>
          Quoted {money(r.quote_amount)}
        </T>
      ) : null}
      {quoting ? (
        <View style={{ gap: 10 }}>
          <FieldRow>
            <Field label="Quote ($)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="900" />
            <Field label="Note (optional)" value={note} onChangeText={setNote} placeholder="Includes trays & serving" />
          </FieldRow>
          <ErrorText message={error} />
          <Button label={r.phone ? 'Save & Text Quote' : 'Save Quote'} variant="forest" height={44} size={13} rounded={12} loading={busy} onPress={save} />
        </View>
      ) : (
        <Button label={isNew ? 'Create & Send Quote' : 'Resend Quote'} variant="forest" height={44} size={13} rounded={12} onPress={() => (isNew ? setQuoting(true) : r.quote_amount ? textQuote(Number(r.quote_amount)) : setQuoting(true))} />
      )}
    </View>
  );
}
