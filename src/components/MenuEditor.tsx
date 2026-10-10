import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { countSubscribers, fetchMenuForEdit, listCatalog, publishMenu, saveMenu, setMenuStatus, setSoldOut, type MenuDraft } from '../api/chef';
import { formatDate, formatDeadline, money, num } from '../lib/format';
import { imageSource } from '../lib/images';
import { shareMenu, type ShareChannel } from '../lib/share';
import { errorMessage } from '../lib/supabase';
import type { Menu, MenuItem, MenuType } from '../lib/types';
import { useQuery } from '../lib/useQuery';
import { addDays, isoToZoned, nextSaturday, zonedToIso } from '../lib/zoned';
import { useSettings } from '../state/settings';
import { colors, fonts, tones } from '../theme';
import { ErrorText } from './BackendNotice';
import { CheckIcon, ChevronIcon } from './icons';
import { Badge, Button, Field, Grid, inputStyle, Loading, Notice, Row, Segmented, T, Toggle } from './ui';

const MENU_TYPES: { key: MenuType; label: string }[] = [
  { key: 'weekly', label: 'Weekly Saturday' },
  { key: 'holiday', label: 'Holiday' },
  { key: 'event', label: 'Special Event' },
  { key: 'catering', label: 'Catering' },
];

interface EntryState {
  menu_item_id: string;
  max_quantity: number | null;
  sold_out: boolean;
  sold_count: number;
}

/**
 * Create / edit a menu: type, title, dates, which dishes are on it (with portion caps),
 * sold-out toggles, publish & share. Used by the Menus tab and /chef/menu/[id].
 */
export function MenuEditor({ menuId, initialType = 'weekly', onSaved }: { menuId: string | null; initialType?: MenuType; onSaved?: (id: string) => void }) {
  const { settings } = useSettings();
  const tz = settings.timezone;
  const catalog = useQuery(listCatalog, []);
  const existing = useQuery(() => (menuId ? fetchMenuForEdit(menuId) : Promise.resolve(null)), [menuId], { refetchOnFocus: false });

  const [id, setId] = useState<string | null>(menuId);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [type, setType] = useState<MenuType>(initialType);
  const [title, setTitle] = useState('');
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [pickup, setPickup] = useState(() => nextSaturday(tz));
  const [deadline, setDeadline] = useState(() => ({ date: addDays(nextSaturday(tz), -1), hour: 20 }));
  const [accepting, setAccepting] = useState(true);
  const [entries, setEntries] = useState<EntryState[]>([]);
  const [editingDishes, setEditingDishes] = useState(false);
  const [notify, setNotify] = useState(true);
  const [subscribers, setSubscribers] = useState<number | null>(null);
  const [busy, setBusy] = useState<'draft' | 'publish' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [justPublished, setJustPublished] = useState<{ queued: number } | null>(null);

  // Load an existing menu into the form.
  useEffect(() => {
    const m = existing.data;
    if (!m) return;
    setMenu(m);
    setId(m.id);
    setType(m.type);
    setTitle(m.title);
    setTitleTouched(true);
    setDescription(m.description);
    setPickup(m.pickup_date);
    const dl = isoToZoned(m.order_deadline, tz);
    setDeadline({ date: dl.date, hour: dl.hour });
    setAccepting(m.accepting_orders);
    setEntries(m.menu_entries.map((e) => ({ menu_item_id: e.menu_item_id, max_quantity: e.max_quantity, sold_out: e.sold_out, sold_count: e.sold_count })));
  }, [existing.data, tz]);

  // New menus start with every visible dish from the catalog.
  useEffect(() => {
    if (!menuId && catalog.data && entries.length === 0) {
      setEntries(catalog.data.filter((d) => !d.is_hidden).map((d) => ({ menu_item_id: d.id, max_quantity: null, sold_out: false, sold_count: 0 })));
    }
  }, [catalog.data, menuId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Default title follows the pickup date until the chef types their own.
  useEffect(() => {
    if (titleTouched) return;
    const d = formatDate(pickup, 'short').replace(/^\w+, /, '');
    setTitle(type === 'weekly' ? `Saturday Menu — ${d}` : `${MENU_TYPES.find((t) => t.key === type)?.label} Menu — ${d}`);
  }, [pickup, type, titleTouched]);

  useEffect(() => {
    countSubscribers(type).then(setSubscribers).catch(() => setSubscribers(null));
  }, [type]);

  const dishById = useMemo(() => new Map((catalog.data ?? []).map((d) => [d.id, d])), [catalog.data]);
  const status = menu?.status ?? 'draft';
  const published = status === 'published';
  const deadlineIso = zonedToIso(deadline.date, deadline.hour, 0, tz);

  const draft = (): MenuDraft => ({
    id: id ?? undefined,
    type,
    title,
    description,
    pickup_date: pickup,
    order_deadline: deadlineIso,
    accepting_orders: accepting,
    entries: entries.map(({ menu_item_id, max_quantity, sold_out }) => ({ menu_item_id, max_quantity, sold_out })),
  });

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const save = async (andPublish: boolean) => {
    setError(null);
    if (!entries.length) return setError('Add at least one dish.');
    if (new Date(deadlineIso) > new Date(zonedToIso(pickup, 23, 59, tz))) return setError('The order deadline must be on or before the pickup date.');
    setBusy(andPublish ? 'publish' : 'draft');
    try {
      const savedId = await saveMenu(draft());
      setId(savedId);
      let queued = 0;
      if (andPublish) queued = await publishMenu(savedId, notify);
      const fresh = await fetchMenuForEdit(savedId);
      setMenu(fresh);
      if (andPublish) setJustPublished({ queued });
      else flash(published ? 'Changes saved' : 'Draft saved');
      onSaved?.(savedId);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  // Sold-out changes on a saved menu apply immediately, so customers see them right away.
  const toggleSold = async (itemId: string) => {
    const next = entries.map((e) => (e.menu_item_id === itemId ? { ...e, sold_out: !e.sold_out } : e));
    setEntries(next);
    if (!id) return;
    const entry = next.find((e) => e.menu_item_id === itemId)!;
    try {
      await setSoldOut(id, itemId, entry.sold_out);
    } catch (e) {
      setEntries(entries);
      setError(errorMessage(e));
    }
  };

  const share = async (ch: ShareChannel) => {
    if (!menu) return;
    try {
      const msg = await shareMenu(ch, menu, settings);
      if (msg) flash(msg);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const toggleAccepting = async (v: boolean) => {
    setAccepting(v);
    if (!id) return;
    try {
      await saveMenu({ ...draft(), accepting_orders: v });
      flash(v ? 'Ordering reopened' : 'Ordering closed');
    } catch (e) {
      setAccepting(!v);
      setError(errorMessage(e));
    }
  };

  if ((menuId && existing.loading && !existing.data) || (catalog.loading && !catalog.data)) return <Loading />;

  const onMenu = new Set(entries.map((e) => e.menu_item_id));
  const notOnMenu = (catalog.data ?? []).filter((d) => !onMenu.has(d.id));

  return (
    <View style={{ gap: 16 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={22} weight={800} accessibilityRole="header" style={{ flex: 1 }}>
          {id ? 'Edit Menu' : 'Create Menu'}
        </T>
        <Badge label={published ? 'Published' : status === 'archived' ? 'Archived' : 'Draft'} tone={published ? 'paid' : 'neutral'} />
      </Row>
      <ErrorText message={catalog.error ?? existing.error} />

      <Segmented scroll options={MENU_TYPES} value={type} onChange={setType} />

      <Field
        label="Menu title"
        value={title}
        onChangeText={(t) => {
          setTitle(t);
          setTitleTouched(true);
        }}
      />
      <Row gap={10} style={{ alignItems: 'flex-start' }}>
        <DateStepper label="Pickup date" value={formatDate(pickup, 'short')} onPrev={() => setPickup(addDays(pickup, -1))} onNext={() => setPickup(addDays(pickup, 1))} />
        <DateStepper
          label="Order deadline"
          value={formatDeadline(deadlineIso, tz, 'short').replace(':00', '')}
          onPrev={() => setDeadline(stepHours(deadline, -1))}
          onNext={() => setDeadline(stepHours(deadline, 1))}
          onLongPrev={() => setDeadline({ ...deadline, date: addDays(deadline.date, -1) })}
          onLongNext={() => setDeadline({ ...deadline, date: addDays(deadline.date, 1) })}
          hint="Hold for ±1 day"
        />
      </Row>
      {type !== 'weekly' ? <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="Shown on the menu and the event card" /> : null}

      <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <T size={16} weight={800}>
          Dishes
        </T>
        <Pressable accessibilityRole="button" onPress={() => setEditingDishes(!editingDishes)} hitSlop={10}>
          <T size={12} weight={editingDishes ? 700 : 400} color={editingDishes ? colors.forest : colors.muted}>
            {editingDishes ? 'Done' : 'Tap to mark sold out · Edit dishes'}
          </T>
        </Pressable>
      </Row>

      {entries.map((e) => {
        const dish = dishById.get(e.menu_item_id);
        if (!dish) return null;
        return (
          <DishRow
            key={e.menu_item_id}
            dish={dish}
            entry={e}
            editing={editingDishes}
            onToggle={() => toggleSold(e.menu_item_id)}
            onCap={(cap) => setEntries(entries.map((x) => (x.menu_item_id === e.menu_item_id ? { ...x, max_quantity: cap } : x)))}
            onRemove={() => setEntries(entries.filter((x) => x.menu_item_id !== e.menu_item_id))}
            onMove={(dir) => {
              const i = entries.indexOf(e);
              const j = i + dir;
              if (j < 0 || j >= entries.length) return;
              const next = [...entries];
              [next[i], next[j]] = [next[j], next[i]];
              setEntries(next);
            }}
          />
        );
      })}

      {editingDishes ? (
        <View style={{ gap: 8 }}>
          {notOnMenu.length ? (
            <T size={13} weight={700} color={colors.muted}>
              Add to this menu
            </T>
          ) : null}
          {notOnMenu.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={`Add ${d.name}`}
              onPress={() => setEntries([...entries, { menu_item_id: d.id, max_quantity: null, sold_out: false, sold_count: 0 }])}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.outline }}
            >
              <T weight={600}>{d.name}</T>
              <T weight={700} color={colors.forest}>
                + Add · {money(d.base_price)}
              </T>
            </Pressable>
          ))}
          <Button label="+ New Dish" variant="outlineForest" height={46} size={14} onPress={() => router.push({ pathname: '/chef/dish/[id]', params: { id: 'new' } })} />
        </View>
      ) : null}

      {published ? (
        <Row style={{ justifyContent: 'space-between', padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder }}>
          <View style={{ flex: 1, gap: 2 }}>
            <T weight={700}>Accepting orders</T>
            <T size={12} color={colors.muted}>
              {accepting ? 'Turn off to close ordering early.' : 'Ordering is closed for this menu.'}
            </T>
          </View>
          <Toggle label="Accepting orders" value={accepting} onChange={toggleAccepting} />
        </Row>
      ) : null}

      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: notify }} onPress={() => setNotify(!notify)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 }}>
        <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: colors.forest, backgroundColor: notify ? colors.forest : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
          {notify ? <CheckIcon size={12} strokeWidth={3.5} /> : null}
        </View>
        <T size={13}>Notify {subscribers === null ? '' : `${subscribers} `}subscribed customers</T>
      </Pressable>

      <Button label={published ? 'Update & Re-send Menu' : 'Publish & Send Menu'} height={54} rounded={16} weight={800} loading={busy === 'publish'} disabled={!!busy} onPress={() => save(true)} />
      <ErrorText message={error} />
      {toast ? <Notice>{toast}</Notice> : null}

      {published && menu ? (
        <View accessibilityRole="summary" style={{ padding: 14, borderRadius: 14, backgroundColor: tones.new.bg, gap: 10 }}>
          <T weight={700} color={colors.forest}>
            {justPublished
              ? `Menu published.${notify ? (justPublished.queued ? ` Announcement queued for ${justPublished.queued} customers.` : ' No subscribers to notify yet.') : ''} Share it:`
              : 'Menu is live. Share it:'}
          </T>
          <Grid columns={4} gap={6}>
            {(['sms', 'whatsapp', 'email', 'copy'] as const).map((ch) => (
              <Pressable key={ch} accessibilityRole="button" onPress={() => share(ch)} style={{ height: 40, borderRadius: 10, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                <T size={12} weight={600}>
                  {{ sms: 'SMS', whatsapp: 'WhatsApp', email: 'Email', copy: 'Copy link' }[ch]}
                </T>
              </Pressable>
            ))}
          </Grid>
        </View>
      ) : null}

      <Grid gap={10}>
        <Button label={published ? 'Save Changes' : 'Save Draft'} variant="outline" height={48} size={14} loading={busy === 'draft'} disabled={!!busy} onPress={() => save(false)} />
        <Button
          label="Preview as Customer"
          variant="outline"
          height={48}
          size={13}
          style={{ paddingHorizontal: 8 }}
          disabled={!id}
          onPress={() => id && router.push({ pathname: '/menu', params: { id } })}
        />
      </Grid>
      {id && published ? (
        <Button
          label="Archive Menu"
          variant="link"
          size={13}
          weight={600}
          onPress={async () => {
            try {
              await setMenuStatus(id, 'archived');
              router.navigate('/chef');
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        />
      ) : null}
    </View>
  );
}

function stepHours(d: { date: string; hour: number }, delta: number): { date: string; hour: number } {
  let hour = d.hour + delta;
  let date = d.date;
  if (hour < 0) {
    hour += 24;
    date = addDays(date, -1);
  } else if (hour > 23) {
    hour -= 24;
    date = addDays(date, 1);
  }
  return { date, hour };
}

function DateStepper({ label, value, onPrev, onNext, onLongPrev, onLongNext, hint }: { label: string; value: string; onPrev: () => void; onNext: () => void; onLongPrev?: () => void; onLongNext?: () => void; hint?: string }) {
  return (
    <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
      <T size={13} weight={600}>
        {label}
      </T>
      <View style={[inputStyle, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Earlier ${label.toLowerCase()}`} onPress={onPrev} onLongPress={onLongPrev} style={{ width: 36, height: 46, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronIcon direction="left" size={16} />
        </Pressable>
        <T size={14} weight={500} align="center" style={{ flex: 1 }} numberOfLines={1} accessibilityLiveRegion="polite">
          {value}
        </T>
        <Pressable accessibilityRole="button" accessibilityLabel={`Later ${label.toLowerCase()}`} onPress={onNext} onLongPress={onLongNext} style={{ width: 36, height: 46, alignItems: 'center', justifyContent: 'center' }}>
          <ChevronIcon size={16} />
        </Pressable>
      </View>
      {hint ? (
        <T size={11} color={colors.muted}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

function DishRow({
  dish,
  entry,
  editing,
  onToggle,
  onCap,
  onRemove,
  onMove,
}: {
  dish: MenuItem;
  entry: EntryState;
  editing: boolean;
  onToggle: () => void;
  onCap: (cap: number | null) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const img = imageSource(dish.image_url);
  const sold = entry.sold_out;
  const portions = entry.max_quantity === null ? 'no limit' : `${entry.max_quantity} portions`;
  const sales = entry.sold_count ? ` · ${entry.sold_count} ordered` : '';
  return (
    <View style={{ padding: 10, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 10 }}>
      <Row gap={12}>
        {img ? (
          <Image source={img} accessibilityLabel={dish.name} contentFit="cover" style={{ width: 52, height: 52, borderRadius: 12 }} />
        ) : (
          <View style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: colors.placeholderImg }} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${dish.name}`}
          onPress={() => router.push({ pathname: '/chef/dish/[id]', params: { id: dish.id } })}
          style={{ flex: 1, minWidth: 0, gap: 2 }}
        >
          <T weight={700}>{dish.name}</T>
          <T size={12} color={colors.muted}>
            {money(num(dish.base_price))} · {portions}
            {sales}
          </T>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: sold }}
          accessibilityLabel={`${dish.name} sold out`}
          onPress={onToggle}
          style={{ height: 36, minWidth: 44, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: sold ? '#FDE3E2' : colors.inputBorder, backgroundColor: sold ? '#FDE3E2' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}
        >
          <T size={12} weight={700} color={sold ? colors.dangerText : colors.secondary}>
            {sold ? 'Sold out' : 'Available'}
          </T>
        </Pressable>
      </Row>
      {editing ? (
        <Row gap={8}>
          <T size={12} weight={600} color={colors.muted}>
            Max portions
          </T>
          <TextInput
            accessibilityLabel={`Max portions for ${dish.name}`}
            value={entry.max_quantity === null ? '' : String(entry.max_quantity)}
            onChangeText={(t) => {
              const n = Number.parseInt(t.replace(/\D/g, ''), 10);
              onCap(Number.isNaN(n) ? null : n);
            }}
            keyboardType="number-pad"
            placeholder="No limit"
            placeholderTextColor="#9A9083"
            style={[inputStyle, { minHeight: 36, width: 90, fontSize: 13, paddingHorizontal: 10, fontFamily: fonts[500] }]}
          />
          <View style={{ flex: 1 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`Move ${dish.name} up`} onPress={() => onMove(-1)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <T weight={700}>↑</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Move ${dish.name} down`} onPress={() => onMove(1)} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
            <T weight={700}>↓</T>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${dish.name} from menu`} onPress={onRemove} style={{ height: 36, paddingHorizontal: 8, justifyContent: 'center' }}>
            <T size={12} weight={700} color={colors.removeText}>
              Remove
            </T>
          </Pressable>
        </Row>
      ) : null}
    </View>
  );
}
