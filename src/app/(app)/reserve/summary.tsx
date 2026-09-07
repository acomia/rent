import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import { MoneyBlock } from '@/components/booking/money-block';
import { RentalBand } from '@/components/booking/rental-band';
import { Button } from '@/components/ui/button';
import { today as todayFn } from '@/features/booking/availability';
import { useBooking } from '@/features/booking/booking-context';
import {
  addDays,
  formatDate,
  formatTime,
  fromKey,
} from '@/features/booking/dates';
import { quoteFromDraft } from '@/features/booking/pricing';
import { formatPeso } from '@/features/catalog/types';

/** Screen 12 — the last clear summary before any money moves. */
export default function Summary() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft } = useBooking();
  const today = todayFn();

  if (!draft?.pickup || !draft.ret) {
    return <NoDraft />;
  }

  const pickup = fromKey(draft.pickup);
  const ret = fromKey(draft.ret);
  const q = quoteFromDraft(draft);
  if (!q) return <NoDraft />;
  const days = q.days;
  const cleanFrom = addDays(ret, 1);
  const cleanTo = addDays(ret, draft.cleaningDays);

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Booking summary" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <BookingCard
          name={draft.itemName}
          photo={draft.itemPhoto}
          pickup={draft.pickup}
          ret={draft.ret}
          days={days}
        />

        <RentalBand
          pickup={pickup}
          ret={ret}
          cleaningDays={draft.cleaningDays}
          fitting={draft.fittingAt ? new Date(draft.fittingAt) : null}
          today={today}
          size="lg"
        />

        {draft.fittingAt ? (
          <View className="flex-row items-center justify-between rounded-2xl border border-hairline bg-surface p-4">
            <View className="gap-0.5">
              <Text className="font-sans-medium text-sm text-ink">
                Fitting appointment
              </Text>
              <Text className="font-sans text-xs text-muted">
                {formatDate(new Date(draft.fittingAt))} ·{' '}
                {formatTime(new Date(draft.fittingAt))}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/reserve/fitting')}
              hitSlop={8}
              className="rounded-full border border-hairline px-4 py-2 active:opacity-70"
            >
              <Text className="font-sans-medium text-sm text-ink">Edit</Text>
            </Pressable>
          </View>
        ) : null}

        <MoneyBlock quote={q} />

        {draft.cleaningDays > 0 ? (
          <View className="rounded-2xl bg-cleaning-soft p-4">
            <Text className="font-sans text-sm leading-5 text-cleaning">
              The item will be in cleaning from {formatDate(cleanFrom)} to{' '}
              {formatDate(cleanTo)}. These dates are blocked for other
              customers.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="border-t border-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={`Reserve with ${formatPeso(q.totalNow)}`}
          onPress={() => router.push('/(app)/reserve/hold')}
        />
      </View>
    </View>
  );
}
