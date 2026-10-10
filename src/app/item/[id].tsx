import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { fetchCurrentMenu, fetchMenu } from '../../api/public';
import { ErrorText } from '../../components/BackendNotice';
import { BackIcon } from '../../components/icons';
import { Button, ChoiceRow, ChoiceTile, Grid, inputStyle, Loading, Row, Screen, Stepper, T } from '../../components/ui';
import { money, num } from '../../lib/format';
import { imageSource } from '../../lib/images';
import { menuIsOpen } from '../../lib/menu';
import {
  defaultSelections,
  describeSelections,
  entryPrice,
  isSoldOut,
  missingRequired,
  remaining,
  selectedValueIds,
  toggleValue,
  unitPrice,
  type Selections,
} from '../../lib/pricing';
import type { ItemOption } from '../../lib/types';
import { useQuery } from '../../lib/useQuery';
import { useCart } from '../../state/cart';
import { colors, fonts } from '../../theme';

const isPortion = (o: ItemOption) => o.kind === 'single' && /portion|size/i.test(o.name);

export default function ItemScreen() {
  const { id, menu: menuId } = useLocalSearchParams<{ id: string; menu?: string }>();
  const cart = useCart();
  const q = useQuery(() => (menuId ? fetchMenu({ id: menuId }) : fetchCurrentMenu()), [menuId]);
  const entry = q.data?.menu_entries.find((e) => e.menu_item_id === id);
  const dish = entry?.menu_items;

  const [sel, setSel] = useState<Selections>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dish) setSel(defaultSelections(dish.item_options));
  }, [dish?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const unit = useMemo(() => (entry && dish ? unitPrice(entryPrice(entry), dish.item_options, sel) : 0), [entry, dish, sel]);

  if (!entry || !dish || !q.data) {
    return (
      <Screen>
        <View style={{ paddingTop: 4 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={{ width: 44, height: 44, justifyContent: 'center' }}>
            <BackIcon />
          </Pressable>
        </View>
        {q.loading ? <Loading /> : <ErrorText message={q.error ?? 'This dish is no longer on the menu.'} />}
      </Screen>
    );
  }

  const menu = q.data;
  const sold = isSoldOut(entry);
  const left = remaining(entry);
  const canAdd = menuIsOpen(menu) && !sold;
  const img = imageSource(dish.image_url, 'large');

  const add = () => {
    const missing = missingRequired(dish.item_options, sel);
    if (missing) {
      setError(`Please choose your ${missing.name.toLowerCase()}.`);
      return;
    }
    cart.add(menu.id, {
      menuItemId: dish.id,
      name: dish.name,
      imageUrl: dish.image_url,
      desc: describeSelections(dish.item_options, sel) || 'Regular',
      unitPrice: unit,
      quantity: qty,
      optionValueIds: selectedValueIds(sel),
      instructions: notes.trim(),
    });
    router.replace('/cart');
  };

  return (
    <Screen
      padded={false}
      gap={0}
      footerBg="#FFFFFF"
      footer={
        canAdd ? (
          <Row gap={12}>
            <Stepper value={qty} onChange={setQty} max={Math.min(20, left ?? 20)} />
            <Button label={`Add to Order · ${money(unit * qty)}`} size={15} style={{ flex: 1 }} onPress={add} />
          </Row>
        ) : (
          <T size={14} weight={700} align="center" color={colors.secondary} style={{ paddingVertical: 14 }}>
            {sold ? 'Sold Out' : 'Ordering for this menu has closed.'}
          </T>
        )
      }
    >
      <View style={{ height: 250, backgroundColor: colors.placeholderImg }}>
        {img ? <Image source={img} accessibilityLabel={dish.name} contentFit="cover" style={{ width: '100%', height: 250 }} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/menu'))}
          style={{ position: 'absolute', top: 12, left: 14, width: 44, height: 44, borderRadius: 999, backgroundColor: 'rgba(255, 249, 240, 0.92)', alignItems: 'center', justifyContent: 'center' }}
        >
          <BackIcon size={20} strokeWidth={2.2} />
        </Pressable>
      </View>

      <View style={{ marginTop: -22, borderTopLeftRadius: 22, borderTopRightRadius: 22, backgroundColor: colors.cream, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, gap: 18 }}>
        <View style={{ gap: 6 }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <T size={25} weight={800} style={{ flex: 1 }} accessibilityRole="header">
              {dish.name}
            </T>
            <T size={19} weight={800}>
              {money(entryPrice(entry))}
            </T>
          </Row>
          <T size={14} color={colors.muted} lineHeight={1.5}>
            {dish.description}
          </T>
        </View>

        {dish.item_options.map((o) => (
          <View key={o.id} style={{ gap: 8 }} accessibilityRole={o.kind === 'single' ? 'radiogroup' : undefined}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={16} weight={700}>
                {o.kind === 'single' && !isPortion(o) ? `Choose your ${o.name.toLowerCase()}` : isPortion(o) ? 'Portion size' : o.name}
              </T>
              {o.required && !isPortion(o) ? (
                <View style={{ paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, backgroundColor: '#E2ECE7' }}>
                  <T size={11} weight={700} color={colors.forest}>
                    REQUIRED
                  </T>
                </View>
              ) : !o.required ? (
                <T size={12} color={colors.muted}>
                  Optional
                </T>
              ) : null}
            </Row>
            {isPortion(o) ? (
              <Grid gap={8}>
                {o.item_option_values.map((v) => (
                  <ChoiceTile
                    key={v.id}
                    height={58}
                    label={v.label}
                    detail={num(v.price_delta) ? '+' + money(v.price_delta) : 'Included'}
                    selected={!!sel[o.id]?.includes(v.id)}
                    onPress={() => setSel((s) => toggleValue(s, o, v.id))}
                  />
                ))}
              </Grid>
            ) : (
              o.item_option_values.map((v) => (
                <ChoiceRow
                  key={v.id}
                  kind={o.kind === 'single' ? 'radio' : 'check'}
                  label={v.label}
                  detail={num(v.price_delta) ? '+' + money(v.price_delta) : o.kind === 'single' ? 'Included' : 'Free'}
                  selected={!!sel[o.id]?.includes(v.id)}
                  onPress={() => {
                    setError(null);
                    setSel((s) => toggleValue(s, o, v.id));
                  }}
                />
              ))
            )}
          </View>
        ))}

        <View style={{ gap: 8 }}>
          <T size={16} weight={700} nativeID="instructions-label">
            Special instructions
          </T>
          <TextInput
            accessibilityLabel="Special instructions"
            value={notes}
            onChangeText={setNotes}
            maxLength={500}
            multiline
            placeholder="e.g. Please make it spicy, no fish, extra sauce."
            placeholderTextColor="#9A9083"
            style={[inputStyle, { minHeight: 84, paddingTop: 12, textAlignVertical: 'top', fontFamily: fonts[400], fontSize: 14 }]}
          />
        </View>
        <ErrorText message={error} />
      </View>
    </Screen>
  );
}
