import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import { RentalBand, RentalBandLegend } from '@/components/booking/rental-band';
import { Button } from '@/components/ui/button';
import { today as todayFn } from '@/features/booking/availability';
import { useBooking } from '@/features/booking/booking-context';
import {
  addDays,
  daysBetween,
  formatDate,
  fromKey,
  toKey,
} from '@/features/booking/dates';
import { useDayStates } from '@/features/booking/hooks';
import { quoteFromDraft } from '@/features/booking/pricing';
import { formatPeso } from '@/features/catalog/types';

/** Screen 9 — the chosen range confirmed back, with what it costs. */
export default function DateRange() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft } = useBooking();
  const today = todayFn();

  // Hooks must run before any early return, so the range is resolved
  // defensively and the query is simply disabled when there isn't one yet.
  const hasRange = Boolean(draft?.pickup && draft?.ret);
  const pickup = draft?.pickup ? fromKey(draft.pickup) : today;
  const ret = draft?.ret ? fromKey(draft.ret) : today;
  const q = quoteFromDraft(
    draft ?? { pricePerDay: 0, deposit: 0, pickup: null, ret: null },
  );
  const days = q?.days ?? 0;

  // Read from the same cached availability the calendar used, rather than
  // recomputing — a second source of truth here would eventually disagree
  // with the calendar the customer just looked at.
  const searchFrom = addDays(ret, (draft?.cleaningDays ?? 0) + 1);
  const searchTo = addDays(searchFrom, 60);
  const { data: states = {} } = useDayStates(
    hasRange ? draft?.itemId : undefined,
    searchFrom,
    searchTo,
  );

  let next: Date | null = null;
  for (let i = 0; i <= daysBetween(searchFrom, searchTo); i++) {
    const d = addDays(searchFrom, i);
    if (states[toKey(d)] === 'available') {
      next = d;
      break;
    }
  }

  if (!hasRange || !draft) {
    return <NoDraft />;
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Your dates" />
      <ScrollView
        contentContainerClassName="gap-7 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-display-bold text-2xl text-ink">
            {formatDate(pickup)} → {formatDate(ret)}
          </Text>
          <Text className="font-sans text-sm text-muted">
            {days} {days === 1 ? 'day' : 'days'}
          </Text>
        </View>

        <View className="gap-3">
          <RentalBand
            pickup={pickup}
            ret={ret}
            cleaningDays={draft.cleaningDays}
            today={today}
            size="md"
          />
          <RentalBandLegend />
        </View>

        <View className="flex-row items-center justify-between border-t border-hairline pt-4">
          <Text className="font-sans text-sm text-muted">
            Rental fee ({days} {days === 1 ? 'day' : 'days'})
          </Text>
          <Text className="font-sans-bold text-base text-ink">
            {formatPeso(q?.rentalFee ?? 0)}
          </Text>
        </View>

        <View className="gap-1 rounded-2xl bg-confirmed-soft p-4">
          <Text className="font-sans-medium text-sm text-confirmed">
            These dates are available.
          </Text>
          {next ? (
            <Text className="font-sans text-xs text-muted">
              Next available after this booking: {formatDate(next)}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="border-t border-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label="Continue"
          onPress={() => router.push('/(app)/reserve/fulfillment')}
        />
      </View>
    </View>
  );
}
