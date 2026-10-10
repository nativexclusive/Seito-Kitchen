import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { listCatalog, saveDish } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { Button, Field, Loading, Row, Screen, ScreenTitle, Segmented, T, Toggle } from '../../../components/ui';
import { money, num } from '../../../lib/format';
import { errorMessage } from '../../../lib/supabase';
import { useQuery } from '../../../lib/useQuery';
import { colors } from '../../../theme';

const CATEGORIES = ['Rice Dishes', 'Soups & Stews', 'Traditional Liberian Meals', 'Sides', 'Drinks', 'Weekly Specials'];

/** Add or edit a dish in the catalog. Price changes never touch past orders (they store their own prices). */
export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const catalog = useQuery(listCatalog, [], { refetchOnFocus: false });
  const dish = catalog.data?.find((d) => d.id === id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[2]);
  const [price, setPrice] = useState('');
  const [hidden, setHidden] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dish) return;
    setName(dish.name);
    setDescription(dish.description);
    setCategory(dish.category);
    setPrice(num(dish.base_price).toFixed(2));
    setHidden(dish.is_hidden);
  }, [dish]);

  const save = async () => {
    setError(null);
    const p = Number.parseFloat(price);
    if (!name.trim()) return setError('Please enter a dish name.');
    if (Number.isNaN(p) || p < 0) return setError('Please enter a price.');
    setBusy(true);
    try {
      await saveDish({ id: isNew ? undefined : id, name: name.trim(), description: description.trim(), category, base_price: Math.round(p * 100) / 100, is_hidden: hidden });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && catalog.loading) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenTitle title={isNew ? 'New Dish' : 'Edit Dish'} fallback="/chef/menus" />
      <Field label="Dish name" value={name} onChangeText={setName} placeholder="e.g. Potato Greens" />
      <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What makes it special" />
      <Field label="Base price ($)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="16.00" />
      <View style={{ gap: 6 }}>
        <T size={13} weight={600}>
          Category
        </T>
        <Segmented scroll options={CATEGORIES.map((c) => ({ key: c, label: c }))} value={category} onChange={setCategory} />
      </View>
      <Row style={{ justifyContent: 'space-between', minHeight: 48 }}>
        <View style={{ flex: 1 }}>
          <T weight={600}>Hide from customers</T>
          <T size={12} color={colors.muted}>
            Hidden dishes don't show on any menu.
          </T>
        </View>
        <Toggle label="Hide from customers" value={hidden} onChange={setHidden} />
      </Row>
      {dish?.item_options.length ? (
        <View style={{ padding: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder, gap: 6 }}>
          <T weight={700}>Choices</T>
          {dish.item_options.map((o) => (
            <T key={o.id} size={13} color={colors.secondary}>
              {o.name}: {o.item_option_values.map((v) => (num(v.price_delta) ? `${v.label} +${money(v.price_delta)}` : v.label)).join(', ')}
            </T>
          ))}
          <T size={12} color={colors.muted}>
            Editing protein, portion and add-on choices in the app is coming next.
          </T>
        </View>
      ) : null}
      <T size={12} color={colors.muted}>
        Photo upload is coming next; dishes without a photo show a placeholder.
      </T>
      <ErrorText message={error} />
      <Button label={isNew ? 'Add Dish' : 'Save Dish'} loading={busy} onPress={save} />
    </Screen>
  );
}
