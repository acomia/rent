import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK, MUTED } from '@/components/catalog/catalog-style';

type FeatherName = ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, FeatherName> = {
  index: 'home',
  bookings: 'calendar',
  items: 'grid',
  more: 'more-horizontal',
};

const LABELS: Record<string, string> = {
  index: 'Dashboard',
  bookings: 'Bookings',
  items: 'Items',
  more: 'More',
};

/**
 * The shop's tab bar. Same construction as the customer one — this is one
 * product in two postures, not two products — but a different set of
 * destinations, because the shop's job is running the day rather than shopping.
 */
export function AdminTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="border-t border-hairline bg-canvas px-2 pt-2"
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }}
    >
      <View className="flex-row items-start justify-around">
        {state.routes.map((route, index) => {
          const label = LABELS[route.name] ?? route.name;
          const isFocused = state.index === index;
          const icon = ICONS[route.name] ?? 'circle';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              onPress={onPress}
              className="min-h-[48px] flex-1 items-center gap-1 py-1 active:opacity-60"
            >
              <Feather name={icon} size={22} color={isFocused ? INK : MUTED} />
              <Text
                className={`text-[11px] ${
                  isFocused
                    ? 'font-sans-semibold text-ink'
                    : 'font-sans text-muted'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
