import { Text, View, Pressable } from 'react-native';

import { BRONZE } from '@/components/catalog/catalog-style';

/**
 * One payment method. The mark is a coloured plate carrying the provider's
 * initial rather than a fabricated logo — real brand assets get dropped in when
 * PayMongo is wired up in Phase 5.
 */
export function PaymentMethodRow({
  name,
  descriptor,
  mark,
  markColor,
  selected,
  onPress,
}: {
  name: string;
  descriptor: string;
  mark: string;
  markColor: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-3 active:opacity-90 ${
        selected
          ? 'border-bronze bg-bronze-soft/40'
          : 'border-hairline bg-surface'
      }`}
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: markColor }}
      >
        <Text className="font-sans-bold text-sm text-white">{mark}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-sans-semibold text-base text-ink">{name}</Text>
        <Text className="font-sans text-xs text-muted">{descriptor}</Text>
      </View>
      <View
        className="h-5 w-5 items-center justify-center rounded-full border-2"
        style={{ borderColor: selected ? BRONZE : '#C9C0B1' }}
      >
        {selected ? (
          <View
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: BRONZE }}
          />
        ) : null}
      </View>
    </Pressable>
  );
}

export const PAYMENT_METHODS = [
  {
    id: 'gcash',
    name: 'GCash',
    descriptor: 'Pay with GCash',
    mark: 'G',
    markColor: '#0B6BCB',
  },
  {
    id: 'maya',
    name: 'Maya',
    descriptor: 'Pay with Maya',
    mark: 'M',
    markColor: '#1B1B1B',
  },
  {
    id: 'grabpay',
    name: 'GrabPay',
    descriptor: 'Pay with GrabPay',
    mark: 'GP',
    markColor: '#0C8B3E',
  },
  {
    id: 'card',
    name: 'Credit or debit card',
    descriptor: 'Visa, Mastercard, JCB',
    mark: '',
    markColor: '#4A4A4A',
  },
] as const;
