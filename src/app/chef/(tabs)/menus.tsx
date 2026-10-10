import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { fetchFocusMenu, listMenus } from '../../../api/chef';
import { ErrorText } from '../../../components/BackendNotice';
import { ChevronIcon } from '../../../components/icons';
import { MenuEditor } from '../../../components/MenuEditor';
import { Badge, Button, Loading, Row, Screen, T } from '../../../components/ui';
import { formatDate } from '../../../lib/format';
import { useQuery } from '../../../lib/useQuery';
import { colors } from '../../../theme';

// The Menus tab opens straight into this week's menu (the Thursday job), with the
// rest of the menus listed underneath.
export default function MenusTab() {
  const focus = useQuery(fetchFocusMenu, [], { refetchOnFocus: false });
  const all = useQuery(listMenus);

  if (focus.loading && !focus.data) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }
  const focusId = focus.data?.id ?? null;
  const others = (all.data ?? []).filter((m) => m.id !== focusId);

  return (
    <Screen contentStyle={{ paddingTop: 4 }}>
      <ErrorText message={focus.error} />
      <MenuEditor key={focusId ?? 'new'} menuId={focusId} onSaved={() => all.reload()} />

      <View style={{ gap: 10, marginTop: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={16} weight={800}>
            Other menus
          </T>
          <Button label="+ New Menu" variant="link" size={14} onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: 'new' } })} />
        </Row>
        {others.length === 0 ? (
          <T size={13} color={colors.muted}>
            No other menus yet.
          </T>
        ) : (
          others.map((m) => (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/chef/menu/[id]', params: { id: m.id } })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.cardBorder }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <T weight={700}>{m.title}</T>
                <T size={12} color={colors.muted}>
                  {formatDate(m.pickup_date, 'short')} · {m.menu_entries.length} dishes
                </T>
              </View>
              <Badge label={m.status === 'published' ? 'Published' : 'Draft'} tone={m.status === 'published' ? 'paid' : 'neutral'} />
              <ChevronIcon size={16} color={colors.muted} />
            </Pressable>
          ))
        )}
      </View>
    </Screen>
  );
}
