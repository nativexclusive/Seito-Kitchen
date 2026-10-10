import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, View } from 'react-native';

import { fetchCurrentMenu, fetchMenu } from '../api/public';
import { BackendNotice, ErrorText } from '../components/BackendNotice';
import { ClockIcon, PlusIcon } from '../components/icons';
import { BackButton, Button, EmptyState, Loading, Row, Screen, T, Wordmark } from '../components/ui';
import { formatDate, formatDeadline, money } from '../lib/format';
import { imageSource } from '../lib/images';
import { menuHeading, menuIsOpen } from '../lib/menu';
import { entryPrice, isSoldOut, remaining } from '../lib/pricing';
import { isSupabaseConfigured } from '../lib/supabase';
import type { MenuEntry } from '../lib/types';
import { useQuery } from '../lib/useQuery';
import { useCart } from '../state/cart';
import { useSettings } from '../state/settings';
import { colors, shadow } from '../theme';

export default function MenuScreen() {
  const { id, slug } = useLocalSearchParams<{ id?: string; slug?: string }>();
  const { settings } = useSettings();
  const cart = useCart();
  const q = useQuery(
    () => (!isSupabaseConfigured ? Promise.resolve(null) : id || slug ? fetchMenu({ id, slug }) : fetchCurrentMenu()),
    [id, slug],
  );
  const menu = q.data;
  const open = menu ? menuIsOpen(menu) : false;
  const showCartBar = !!menu && cart.count > 0 && cart.menuId === menu.id;

  return (
    <Screen
      gap={12}
      refreshControl={<RefreshControl refreshing={false} onRefresh={q.reload} />}
      footer={
        showCartBar ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View order, ${cart.count} items, ${money(cart.subtotal)}`}
            onPress={() => router.push('/cart')}
            style={{ height: 56, paddingHorizontal: 18, borderRadius: 16, backgroundColor: colors.forest, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Row gap={10}>
              <View style={{ minWidth: 26, height: 26, paddingHorizontal: 6, borderRadius: 999, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
                <T size={13} weight={800}>
                  {cart.count}
                </T>
              </View>
              <T size={14} weight={600} color={colors.cream}>
                View Order
              </T>
            </Row>
            <T size={16} weight={800} color={colors.cream}>
              {money(cart.subtotal)}
            </T>
          </Pressable>
        ) : undefined
      }
    >
      <Row style={{ justifyContent: 'space-between' }}>
        <BackButton />
        <Wordmark />
        <View style={{ width: 44 }} />
      </Row>

      <BackendNotice />
      <ErrorText message={q.error} />
      {q.loading && !menu ? <Loading /> : null}
      {!q.loading && !menu && isSupabaseConfigured && !q.error ? (
        <EmptyState title="No menu posted yet" body="Mama posts the Saturday menu every Thursday. Check back soon!" />
      ) : null}

      {menu ? (
        <>
          <T size={27} weight={800} style={{ letterSpacing: -0.5 }} accessibilityRole="header">
            {menuHeading(menu)}
          </T>
          <T size={14} weight={600} color={colors.forest} style={{ marginTop: -6 }}>
            Pickup {formatDate(menu.pickup_date)}
          </T>
          <Row style={{ paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: open ? '#FDEBC8' : '#FDE3E2' }}>
            <ClockIcon color={open ? '#6B4700' : '#8A2A25'} />
            <T size={13} weight={600} color={open ? '#6B4700' : '#8A2A25'} style={{ flex: 1 }}>
              {open ? `Orders close ${formatDeadline(menu.order_deadline, settings.timezone)}` : 'Ordering for this menu has closed.'}
            </T>
          </Row>
          {menu.description ? (
            <T size={14} color={colors.muted} lineHeight={1.5}>
              {menu.description}
            </T>
          ) : null}
          {menu.menu_entries.map((e) => (
            <DishCard key={e.menu_item_id} entry={e} menuId={menu.id} canOrder={open} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

function DishCard({ entry, menuId, canOrder }: { entry: MenuEntry; menuId: string; canOrder: boolean }) {
  const cart = useCart();
  const dish = entry.menu_items;
  const sold = isSoldOut(entry);
  const left = remaining(entry);
  const custom = dish.item_options.length > 0;
  const price = entryPrice(entry);
  const img = imageSource(dish.image_url);

  const add = () => {
    if (custom) {
      router.push({ pathname: '/item/[id]', params: { id: dish.id, menu: menuId } });
    } else {
      cart.add(menuId, { menuItemId: dish.id, name: dish.name, imageUrl: dish.image_url, desc: 'Regular', unitPrice: price, quantity: 1, optionValueIds: [], instructions: '' });
    }
  };

  return (
    <View style={[{ flexDirection: 'row', gap: 14, padding: 12, borderRadius: 18, backgroundColor: sold ? colors.soldOutCard : '#FFFFFF' }, shadow.card]}>
      {img ? (
        <Image source={img} accessibilityLabel={dish.name} contentFit="cover" style={{ width: 88, height: 88, borderRadius: 14 }} />
      ) : (
        <View style={{ width: 88, height: 88, borderRadius: 14, backgroundColor: colors.placeholderImg, alignItems: 'center', justifyContent: 'center', padding: 6 }}>
          <T size={11} weight={600} color={colors.secondary} align="center">
            {dish.name} photo
          </T>
        </View>
      )}
      <View style={{ flex: 1, gap: 4, minWidth: 0 }}>
        <T size={16} weight={700}>
          {dish.name}
        </T>
        <T size={13} color={colors.muted} lineHeight={1.4}>
          {dish.description}
        </T>
        <Row style={{ marginTop: 'auto', justifyContent: 'space-between' }}>
          <T size={16} weight={800}>
            {money(price)}
          </T>
          {sold ? (
            <View style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: colors.placeholderImg }}>
              <T size={12} weight={700} color={colors.secondary}>
                Sold Out
              </T>
            </View>
          ) : (
            <Row>
              {left !== null ? (
                <T size={12} weight={600} color={colors.muted}>
                  {left} left
                </T>
              ) : null}
              {canOrder ? (
                <Button
                  accessibilityLabel={(custom ? 'Customize ' : 'Add ') + dish.name}
                  height={40}
                  rounded={10}
                  size={13}
                  style={{ paddingHorizontal: 12, gap: 4 }}
                  left={<PlusIcon />}
                  label={custom ? 'Choose' : 'Add'}
                  onPress={add}
                />
              ) : null}
            </Row>
          )}
        </Row>
      </View>
    </View>
  );
}
