import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import {
  CalendarLegend,
  MonthCalendar,
} from '@/components/booking/month-calendar';
import { Button } from '@/components/ui/button';
import { today as todayFn } from '@/features/booking/availability';
import { useBooking } from '@/features/booking/booking-context';
import { addDays, daysBetween, toKey } from '@/features/booking/dates';
import { useDayStates } from '@/features/booking/hooks';
import { useItem } from '@/features/catalog/hooks';

/** Screen 8 — availability. Pick the pickup day, then the return day. */
export default function SelectDates() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const { draft, startDraft, setRange } = useBooking();
  const today = todayFn();

  // The flow is normally entered from an item's "Check dates". It can also be
  // opened directly with ?itemId= (a notification, a shared link), in which case
  // the draft is started here from the item itself.
  const { data: linkedItem } = useItem(draft ? undefined : itemId);
  useEffect(() => {
    if (draft || !linkedItem) return;
    startDraft({
      id: linkedItem.id,
      name: linkedItem.name,
      photo: linkedItem.photos[0] ?? null,
      pricePerDay: linkedItem.pricePerDay,
      deposit: linkedItem.deposit,
      cleaningBufferDays: linkedItem.cleaningBufferDays,
    });
  }, [draft, linkedItem, startDraft]);

  const [selection, setSelection] = useState<{
    pickup: Date | null;
    ret: Date | null;
  }>({ pickup: null, ret: null });

  // Fetch the visible month plus a month either side, so stepping the calendar
  // does not blank out and a range can straddle a month boundary.
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const windowFrom = new Date(cursor.year, cursor.month - 1, 1);
  const windowTo = new Date(cursor.year, cursor.month + 2, 0);
  const { data: states = {}, isLoading: statesLoading } = useDayStates(
    draft?.itemId,
    windowFrom,
    windowTo,
    draft?.size,
  );

  if (!draft) {
    return <NoDraft />;
  }

  const days =
    selection.pickup && selection.ret
      ? daysBetween(selection.pickup, selection.ret) + 1
      : 0;

  // Every day in the range must be available. The exclusion constraint is the
  // real arbiter — this only stops the customer walking into a doomed insert.
  let bookable = Boolean(selection.pickup && selection.ret);
  if (selection.pickup && selection.ret) {
    for (let i = 0; i <= daysBetween(selection.pickup, selection.ret); i++) {
      if (states[toKey(addDays(selection.pickup, i))] !== 'available') {
        bookable = false;
        break;
      }
    }
  }

  function onContinue() {
    if (!selection.pickup || !selection.ret) return;
    setRange(toKey(selection.pickup), toKey(selection.ret));
    router.push('/(app)/reserve/range');
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Select dates" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <MonthCalendar
          today={today}
          selection={selection}
          onChange={setSelection}
          states={states}
          onMonthChange={(year, month) =>
            // Bail when the month is unchanged: committing a fresh object would
            // re-render regardless, since React compares with Object.is.
            setCursor((c) =>
              c.year === year && c.month === month ? c : { year, month },
            )
          }
        />
        <CalendarLegend />
        {selection.pickup && selection.ret && !bookable ? (
          <View className="rounded-2xl bg-overdue-soft p-4">
            <Text className="font-sans text-sm leading-5 text-overdue">
              Some days in that range are already taken. Pick a different pickup
              or return date.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={days > 0 ? `Continue (${days} days)` : 'Continue'}
          disabled={days === 0 || !bookable || statesLoading}
          onPress={onContinue}
        />
      </View>
    </View>
  );
}
