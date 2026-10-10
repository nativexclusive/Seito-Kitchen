import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';

import { fetchCurrentMenu } from '../api/public';
import { BackendNotice } from '../components/BackendNotice';
import { CalendarIcon, LogoMark } from '../components/icons';
import { Button, Grid, Row, Screen, T } from '../components/ui';
import { formatDate, formatDeadline } from '../lib/format';
import { heroImage } from '../lib/images';
import { isSupabaseConfigured } from '../lib/supabase';
import { useQuery } from '../lib/useQuery';
import { useCart } from '../state/cart';
import { useSettings } from '../state/settings';
import { colors } from '../theme';

export default function Welcome() {
  const { settings } = useSettings();
  const cart = useCart();
  const menu = useQuery(() => (isSupabaseConfigured ? fetchCurrentMenu() : Promise.resolve(null)));

  const openMyOrders = () => {
    if (cart.orders.length === 1) router.push(`/track/${cart.orders[0].token}`);
    else router.push('/orders');
  };

  return (
    <Screen topColor={colors.forest} padded={false} contentStyle={{ flexGrow: 1 }}>
      <View style={{ flex: 1, backgroundColor: colors.forest, alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 28 }}>
        <LogoMark />
        <T script size={56} color={colors.gold} align="center" style={{ marginTop: 2, lineHeight: 62 }} accessibilityRole="header">
          {settings.business_name}
        </T>
        <T size={12} weight={700} color={colors.gold} style={{ marginTop: 2, letterSpacing: 3.8 }}>
          LIBERIAN CUISINE
        </T>
        <T size={13} weight={600} color={colors.cream} align="center" lineHeight={1.5} style={{ marginTop: 12, letterSpacing: 1.8, maxWidth: 220 }}>
          {settings.tagline.toUpperCase()}
        </T>
        <Image
          source={heroImage}
          accessibilityLabel="Plate of Liberian beef, cassava leaf, rice and fried plantain"
          contentFit="cover"
          style={{ marginTop: 18, width: '100%', aspectRatio: 342 / 220, borderRadius: 24 }}
        />

        <View style={{ marginTop: 16, width: '100%', gap: 12 }}>
          <BackendNotice />
          {menu.data ? (
            <Row
              gap={12}
              style={{
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderRadius: 16,
                backgroundColor: 'rgba(255, 249, 240, 0.08)',
                borderWidth: 1,
                borderColor: 'rgba(242, 173, 50, 0.35)',
              }}
            >
              <CalendarIcon />
              <View style={{ gap: 2, flex: 1 }}>
                <T size={14} weight={700} color={colors.cream}>
                  Next pickup: {formatDate(menu.data.pickup_date)}
                </T>
                <T size={12} color={colors.onForestMuted}>
                  Order by {formatDeadline(menu.data.order_deadline, settings.timezone)}
                </T>
              </View>
            </Row>
          ) : !menu.loading && isSupabaseConfigured ? (
            <T size={13} color={colors.onForestMuted} align="center">
              This week's menu isn't posted yet. Check back Thursday!
            </T>
          ) : null}
        </View>

        <View style={{ marginTop: 16, width: '100%', gap: 10 }}>
          <Button label="View This Week's Menu" onPress={() => router.push('/menu')} />
          <Grid gap={10}>
            <Button label="Special Events" variant="onForest" height={48} size={14} weight={600} onPress={() => router.push('/events')} />
            <Button label="My Orders" variant="onForest" height={48} size={14} weight={600} onPress={openMyOrders} />
          </Grid>
        </View>

        <Row gap={0} style={{ marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <T size={13} color={colors.onForestMuted}>
            No account needed to order ·{' '}
          </T>
          <Button variant="link" height={36} onPress={() => router.push('/sign-in')}>
            <T size={13} weight={700} color={colors.gold} style={{ textDecorationLine: 'underline' }}>
              Sign In / Create Account
            </T>
          </Button>
        </Row>
      </View>
    </Screen>
  );
}
