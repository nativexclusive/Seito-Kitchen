import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { ChevronIcon } from '../components/icons';
import { Button, EmptyState, Row, Screen, ScreenTitle, T } from '../components/ui';
import { useCart } from '../state/cart';
import { colors } from '../theme';

/** Orders placed from this device. Guests track orders with the link saved here. */
export default function MyOrders() {
  const { orders } = useCart();
  return (
    <Screen>
      <ScreenTitle title="My Orders" />
      {orders.length === 0 ? (
        <EmptyState
          title="No orders on this device yet"
          body="Orders you place here show up in this list so you can track them."
          action={<Button label="View This Week's Menu" height={46} size={14} rounded={12} onPress={() => router.replace('/menu')} />}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {orders.map((o) => (
            <Pressable
              key={o.token}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/track/[token]', params: { token: o.token } })}
              style={{ padding: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <View style={{ gap: 2 }}>
                  <T size={15} weight={800}>
                    Order #{o.orderNumber}
                  </T>
                  <T size={12} color={colors.muted}>
                    Placed {new Date(o.placedAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </T>
                </View>
                <ChevronIcon color={colors.muted} />
              </Row>
            </Pressable>
          ))}
        </View>
      )}
    </Screen>
  );
}
