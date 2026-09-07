import { Text, View } from 'react-native';

import { BRONZE, HAIRLINE } from '@/components/catalog/catalog-style';

/**
 * The three stages of a gateway handoff. Shown while payment completes — the
 * highest-anxiety moment in the app, so it must look like progress rather than
 * a stall.
 */
export function FlowStepper({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <View className="w-full gap-2">
      <View className="flex-row items-center">
        {steps.map((s, i) => (
          <View key={s} className="flex-1 flex-row items-center">
            <View
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: i <= current ? BRONZE : HAIRLINE }}
            />
            {i < steps.length - 1 ? (
              <View
                className="h-0.5 flex-1"
                style={{ backgroundColor: i < current ? BRONZE : HAIRLINE }}
              />
            ) : null}
          </View>
        ))}
      </View>
      <View className="flex-row">
        {steps.map((s, i) => (
          <View
            key={s}
            className={`flex-1 ${i === steps.length - 1 ? 'items-end' : 'items-start'}`}
          >
            <Text
              className={`text-[11px] ${
                i <= current
                  ? 'font-sans-medium text-ink'
                  : 'font-sans text-muted'
              }`}
            >
              {s}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
