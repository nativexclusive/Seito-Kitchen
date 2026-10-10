import { router, useLocalSearchParams } from 'expo-router';

import { MenuEditor } from '../../../components/MenuEditor';
import { BackButton, Screen } from '../../../components/ui';
import type { MenuType } from '../../../lib/types';

export default function EditMenuScreen() {
  const { id, type } = useLocalSearchParams<{ id: string; type?: MenuType }>();
  const isNew = id === 'new';
  return (
    <Screen gap={8}>
      <BackButton fallback="/chef/menus" />
      <MenuEditor
        menuId={isNew ? null : id}
        initialType={type ?? 'weekly'}
        onSaved={(savedId) => {
          if (isNew) router.setParams({ id: savedId });
        }}
      />
    </Screen>
  );
}
