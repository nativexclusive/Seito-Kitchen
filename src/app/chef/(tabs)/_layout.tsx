import { Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { T } from '../../../components/ui';
import { colors } from '../../../theme';

const TABS: { name: string; label: string }[] = [
  { name: 'index', label: 'Home' },
  { name: 'menus', label: 'Menus' },
  { name: 'orders', label: 'Orders' },
  { name: 'customers', label: 'Customers' },
  { name: 'events', label: 'Events' },
];

type TabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void };
};

function ChefTabBar({ state, navigation }: TabBarProps) {
  const current = state.routes[state.index]?.name;
  return (
    <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: colors.divider }}>
      <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingHorizontal: 6, paddingTop: 6, paddingBottom: 8, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {TABS.map((t) => {
          const on = current === t.name;
          return (
            <Pressable
              key={t.name}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => navigation.navigate(t.name)}
              style={{ flex: 1, height: 52, alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <View style={{ width: 22, height: 4, borderRadius: 999, backgroundColor: on ? colors.gold : 'transparent' }} />
              <T size={11} weight={on ? 800 : 600} color={on ? colors.forest : colors.muted}>
                {t.label}
              </T>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export default function ChefTabs() {
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.cream } }} tabBar={(props) => <ChefTabBar {...(props as unknown as TabBarProps)} />}>
      {TABS.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.label }} />
      ))}
    </Tabs>
  );
}
