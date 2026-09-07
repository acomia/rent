import { Feather } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK } from '@/components/catalog/catalog-style';

/**
 * The header on the admin tab screens: the wordmark with an Admin chip, so the
 * shop always knows which side of the app it is standing in. Screens reached by
 * pushing (a booking, an item) use `AdminHeader` with its back affordance instead.
 */
export function ShopHeader({ title }: { title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 10 }}
    >
      <View className="flex-row items-center gap-2.5">
        <Text className="font-display-bold text-2xl text-ink">Renta</Text>
        <View className="rounded-full bg-bronze-soft px-2.5 py-1">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[1.5px] text-bronze-deep">
            {title ?? 'Admin'}
          </Text>
        </View>
      </View>
      <Feather name="bell" size={20} color={INK} />
    </View>
  );
}
