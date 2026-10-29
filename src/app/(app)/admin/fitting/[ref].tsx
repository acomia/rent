import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminHeader } from '@/components/admin/admin-header';
import { MonthCalendar } from '@/components/booking/month-calendar';
import { Button } from '@/components/ui/button';
import {
  useAdminBooking,
  useRescheduleFitting,
} from '@/features/admin/bookings-hooks';
import type { DayStateMap } from '@/features/booking/api';
import { today as todayFn } from '@/features/booking/availability';
import {
  daysBetween,
  FITTING_SLOTS,
  fittingSlotToIso,
  formatDate,
  formatTime,
  fromKey,
  monthMatrix,
  startOfDay,
  toKey,
} from '@/features/booking/dates';

/**
 * The shop moves a fitting to a new day and time.
 *
 * Same picker as the customer's (screen 11), with one rule relaxed: the shop is
 * not held to `FITTING_BUFFER_DAYS`, because the lead time exists for the
 * shop's own prep and the shop is the one choosing. It still cannot pick a past
 * day or slot, or a day after the rental is due back.
 */
export default function AdminRescheduleFitting() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { data: booking } = useAdminBooking(ref);
  const reschedule = useRescheduleFitting();
  const today = todayFn();

  const current = booking?.fittingAt ? new Date(booking.fittingAt) : null;
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const selection = useMemo(() => ({ pickup: day, ret: day }), [day]);
  const retKey = booking?.ret;

  const states = useMemo<DayStateMap>(() => {
    const map: DayStateMap = {};
    const retDate = retKey ? fromKey(retKey) : null;
    for (const row of monthMatrix(cursor.year, cursor.month)) {
      for (const date of row) {
        if (!date) continue;
        const past = daysBetween(today, date) < 0;
        const afterReturn = retDate ? daysBetween(retDate, date) > 0 : false;
        if (past || afterReturn) map[toKey(date)] = 'unavailable';
      }
    }
    return map;
  }, [cursor.year, cursor.month, today, retKey]);

  // On today, slots that have already started are gone. "Now" is taken when
  // the day is picked, not during render, which must stay pure.
  const [pickedAt, setPickedAt] = useState(0);
  const slotPassed = (s: string) =>
    day !== null && new Date(fittingSlotToIso(day, s)).getTime() <= pickedAt;

  const next = day && slot ? fittingSlotToIso(day, slot) : null;
  const unchanged =
    next !== null &&
    current !== null &&
    new Date(next).getTime() === current.getTime();

  function onSave() {
    if (!booking || !next) return;
    reschedule.mutate(
      { reference: booking.ref, fittingAt: next },
      {
        onSuccess: () => router.back(),
        onError: (e) =>
          Alert.alert(
            'That didn’t go through',
            e instanceof Error ? e.message : 'Please try again.',
          ),
      },
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader title="Reschedule fitting" onBack={() => router.back()} />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            Currently
          </Text>
          <Text className="font-sans-medium text-base text-ink">
            {current
              ? `${formatDate(current)} · ${formatTime(current)}`
              : 'No fitting booked'}
          </Text>
          <Text className="font-sans text-xs text-muted">
            The new time is saved as confirmed — agree it with the customer
            first. This does not move the rental dates.
          </Text>
        </View>

        {booking ? (
          <MonthCalendar
            today={today}
            unknownDay="available"
            states={states}
            selection={selection}
            onChange={(s) => {
              setDay(s.pickup ? startOfDay(s.pickup) : null);
              setSlot(null);
              setPickedAt(Date.now());
            }}
            onMonthChange={(year, month) =>
              setCursor((c) =>
                c.year === year && c.month === month ? c : { year, month },
              )
            }
          />
        ) : null}

        <View className="gap-3">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            Times
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {FITTING_SLOTS.map((s) => {
              const active = slot === s;
              const disabled = !day || slotPassed(s);
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled }}
                  disabled={disabled}
                  onPress={() => setSlot(s)}
                  className={`h-11 items-center justify-center rounded-full border px-5 active:opacity-80 ${
                    active
                      ? 'border-charcoal bg-charcoal'
                      : 'border-hairline bg-surface'
                  } ${disabled ? 'opacity-40' : ''}`}
                >
                  <Text
                    className={`text-sm ${
                      active
                        ? 'font-sans-semibold text-white'
                        : 'font-sans-medium text-ink'
                    }`}
                  >
                    {s}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {!day ? (
            <Text className="font-sans text-xs text-muted">
              Pick a day first to see times.
            </Text>
          ) : unchanged ? (
            <Text className="font-sans text-xs text-muted">
              That&apos;s the time it&apos;s already booked for.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      <View
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label="Save new time"
          disabled={!next || unchanged}
          loading={reschedule.isPending}
          onPress={onSave}
        />
      </View>
    </View>
  );
}
