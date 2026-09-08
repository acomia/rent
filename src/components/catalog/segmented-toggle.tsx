import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

type Option = { label: string; value: string };

/**
 * Pill segmented toggle with a charcoal thumb that slides between options.
 * Width is measured on layout so the thumb tracks any option count.
 */
export function SegmentedToggle({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const PADDING = 5;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segWidth = width > 0 ? (width - PADDING * 2) / options.length : 0;

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: withTiming(segWidth * index, { duration: 220 }) },
    ],
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      className="h-12 flex-row rounded-full border-hairline bg-canvas-subtle"
      style={{ padding: PADDING }}
    >
      {segWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: PADDING,
              bottom: PADDING,
              left: PADDING,
              width: segWidth,
            },
            thumbStyle,
          ]}
          className="rounded-full bg-charcoal"
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            className="flex-1 items-center justify-center"
          >
            <Text
              className={`text-sm ${
                active
                  ? 'font-sans-semibold text-white'
                  : 'font-sans-medium text-ink'
              }`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
