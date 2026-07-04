import { useState } from 'react';
import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

type Option = { label: string; value: string };

/**
 * The signature control: a pill segmented toggle with a grape thumb that slides
 * between options. Width is measured on layout so the thumb tracks any option
 * count.
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
  const PADDING = 6;
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
      className="h-14 flex-row rounded-full bg-lilac dark:bg-night-800"
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
          className="rounded-full bg-grape dark:bg-grape-soft"
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
              className={`font-sans-semibold text-base ${
                active ? 'text-white' : 'text-ink dark:text-cloud'
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
