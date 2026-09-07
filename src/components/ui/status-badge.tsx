import { Text, View } from 'react-native';

import type { BookingStatus } from '@/features/booking/types';

/**
 * The five booking states plus a settled/past neutral, drawn as pale pills with
 * matching ink. Status colour carries exactly one meaning across the app, and is
 * always paired with its word — never colour alone (see DESIGN.md).
 *
 * Booking status and payment status never merge into one badge: this component
 * is for booking status only. Money belongs beside an amount.
 */
export type Status =
  'pending' | 'confirmed' | 'outnow' | 'cleaning' | 'overdue' | 'settled';

const styles: Record<Status, { pill: string; label: string; text: string }> = {
  pending: { pill: 'bg-pending-soft', label: 'Pending', text: 'text-pending' },
  confirmed: {
    pill: 'bg-confirmed-soft',
    label: 'Confirmed',
    text: 'text-confirmed',
  },
  outnow: { pill: 'bg-outnow-soft', label: 'Out now', text: 'text-outnow' },
  cleaning: {
    pill: 'bg-cleaning-soft',
    label: 'In cleaning',
    text: 'text-cleaning',
  },
  overdue: { pill: 'bg-overdue-soft', label: 'Overdue', text: 'text-overdue' },
  settled: {
    pill: 'bg-settled-soft',
    label: 'Completed',
    text: 'text-settled',
  },
};

export function StatusBadge({
  status,
  label,
}: {
  status: Status;
  /** Overrides the default word — the colour still means the same thing. */
  label?: string;
}) {
  const s = styles[status];
  return (
    <View className={`self-start rounded-full px-3 py-1 ${s.pill}`}>
      <Text className={`font-sans-medium text-xs ${s.text}`}>
        {label ?? s.label}
      </Text>
    </View>
  );
}

/**
 * The customer's booking lifecycle → badge tone.
 *
 * Lives beside the `styles` record it maps into, so adding a state means
 * touching one file. Two screens previously carried byte-identical private
 * copies, which meant a new state rendered in one and crashed the other.
 *
 * The shop's nine-state equivalent is `ADMIN_STATUS` in
 * `components/admin/booking-row.tsx` — deliberately separate, because the two
 * audiences see different granularity.
 */
export const CUSTOMER_STATUS: Record<BookingStatus, Status> = {
  pending: 'pending',
  confirmed: 'confirmed',
  outnow: 'outnow',
  returned: 'cleaning',
  completed: 'settled',
  cancelled: 'settled',
};
