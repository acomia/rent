import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GRAPE } from '@/components/catalog/catalog-style';
import { useCart } from '@/features/catalog/cart-context';

type FeatherName = ComponentProps<typeof Feather>['name'];

const WHITE = '#FFFFFF';
/** Inactive icons: white dimmed on the grape pill. */
const WHITE_DIM = 'rgba(255,255,255,0.6)';

const ICONS: Record<string, FeatherName> = {
  index: 'home',
  search: 'search',
  bag: 'shopping-bag',
  profile: 'user',
};

/**
 * Floating grape pill tab bar: a rounded bar with side margins and a soft
 * shadow, white line icons (no labels), and a subtle white highlight behind the
 * active tab. The bag tab carries a live count badge.
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { count } = useCart();

  return (
    <View
      pointerEvents="box-none"
      className="bg-canvas px-5 pt-2 dark:bg-night-950"
      style={{ paddingBottom: insets.bottom > 0 ? insets.bottom : 16 }}
    >
      <View
        className="flex-row items-center justify-around rounded-full bg-grape px-2 py-2.5 dark:bg-grape-soft"
        style={{
          shadowColor: GRAPE,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        {state.routes.map((route, index) => {
          const label = descriptors[route.key].options.title ?? route.name;
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
              className="h-12 w-12 items-center justify-center rounded-full active:opacity-70"
            >
              {isFocused ? (
                <View className="absolute inset-0 rounded-full bg-white/20" />
              ) : null}
              <View>
                <Feather
                  name={icon}
                  size={24}
                  color={isFocused ? WHITE : WHITE_DIM}
                />
                {showBadge ? (
                  <View className="absolute -right-2.5 -top-2 h-4 min-w-[16px] items-center justify-center rounded-full bg-bubblegum px-1">
                    <Text className="font-sans-bold text-[10px] leading-none text-white">
                      {count}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
