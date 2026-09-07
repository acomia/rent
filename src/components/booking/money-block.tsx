import { Text, View } from 'react-native';

import { formatPeso } from '@/features/catalog/types';
import type { Quote } from '@/features/booking/types';

/**
 * The money block. Always the same four rows in the same order, because
 * customers compare them across screens, and the deposit is labelled refundable
 * every single time it appears (see DESIGN.md).
 *
 * Payment state is never a badge here — it is always attached to an amount.
 */
function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between py-2">
      <Text
        className={`text-sm ${strong ? 'font-sans-semibold text-ink' : 'font-sans text-muted'}`}
      >
        {label}
      </Text>
      <Text
        className={`text-sm ${strong ? 'font-sans-bold text-ink' : 'font-sans-medium text-ink'}`}
      >
        {value}
      </Text>
    </View>
  );
}

export function MoneyBlock({ quote }: { quote: Quote }) {
  return (
    <View className="divide-y divide-hairline">
      <Row
        label={`Rental fee (${quote.days} ${quote.days === 1 ? 'day' : 'days'})`}
        value={formatPeso(quote.rentalFee)}
      />
      <Row label="Refundable deposit" value={formatPeso(quote.deposit)} />
      <Row label="Total to pay now" value={formatPeso(quote.totalNow)} strong />
      <Row
        label="Balance due at pickup"
        value={formatPeso(quote.balanceAtPickup)}
        strong
      />
    </View>
  );
}

/** The settled variant shown once the deposit has actually been paid. */
export function PaidBlock({
  paid,
  balance,
}: {
  paid: number;
  balance: number;
}) {
  return (
    <View className="divide-y divide-hairline">
      <Row label="Total paid" value={formatPeso(paid)} />
      <Row label="Balance at pickup" value={formatPeso(balance)} strong />
    </View>
  );
}
