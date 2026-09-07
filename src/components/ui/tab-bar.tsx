import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK, MUTED } from '@/components/catalog/catalog-style';
import { useCart } from '@/features/catalog/cart-context';

type FeatherName = ComponentProps<typeof Feather>['name'];

const ICONS: Record<string, FeatherName> = {
  index: 'home',
  bookings: 'calendar',
  profile: 'user',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  bookings: 'Bookings',
  profile: 'Profile',
};

/**
 * A quiet bar on the ivory ground with a hairline above it: single-weight line
 * icons with their labels beneath, active in ink and inactive in muted. The bag
 * tab carries a live count.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  return (
    <View
      className="border-t border-hairline bg-canvas px-2 pt-2"
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }}
    >
      <View className="flex-row items-start justify-around">
        {state.routes.map((route, index) => {
          const label =
            LABELS[route.name] ??
            descriptors[route.key].options.title ??
            route.name;
          const isFocused = state.index === index;
          const icon = ICONS[route.name] ?? 'circle';
          const showBadge = route.name === 'bag' && count > 0;

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

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
              onPress={onPress}
              onLongPress={onLongPress}
              className="min-h-[48px] flex-1 items-center gap-1 py-1 active:opacity-60"
            >
              <View>
                <Feather
                  name={icon}
                  size={22}
                  color={isFocused ? INK : MUTED}
                />
                {showBadge ? (
                  <View className="absolute -right-2.5 -top-1.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-bronze px-1">
                    <Text className="font-sans-bold text-[10px] leading-none text-white">
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
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
