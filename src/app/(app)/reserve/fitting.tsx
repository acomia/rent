import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/booking/flow-header';
import { MonthCalendar } from '@/components/booking/month-calendar';
import { Button } from '@/components/ui/button';
import { today as todayFn } from '@/features/booking/availability';
import { useBooking } from '@/features/booking/booking-context';

const SLOTS = ['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM'];

function toIso(day: Date, slot: string): string {
  const [time, suffix] = slot.split(' ');
  const [h, m] = time.split(':').map(Number);
  const hour =
    suffix === 'PM' && h !== 12 ? h + 12 : h === 12 && suffix === 'AM' ? 0 : h;
  const d = new Date(day);
  d.setHours(hour, m, 0, 0);
  return d.toISOString();
}

/**
 * Screen 11 — the fitting calendar.
 *
 * This is deliberately a different object from the rental calendar: it picks a
 * single day and a time slot, and it says plainly that it does not hold the
 * rental dates (project-scope.md #11).
 */
export default function Fitting() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, setFitting } = useBooking();
  const today = todayFn();

  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const selection = useMemo(() => ({ pickup: day, ret: day }), [day]);

  function onConfirm() {
    if (!day || !slot) return;
    setFitting(toIso(day, slot));
    router.push('/(app)/reserve/summary');
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-display-bold text-3xl leading-tight text-ink">
            Book a fitting
          </Text>
          <Text className="font-sans text-sm text-muted">
            This does not hold the rental dates.
          </Text>
        </View>

        {draft ? (
          <MonthCalendar
            today={today}
            unknownDay="available"
            selection={selection}
            onChange={(s) => {
              setDay(s.pickup);
              setSlot(null);
            }}
          />
        ) : null}

        <View className="gap-3">
          <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
            Available times
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SLOTS.map((s) => {
              const active = slot === s;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active, disabled: !day }}
                  disabled={!day}
                  onPress={() => setSlot(s)}
                  className={`h-11 items-center justify-center rounded-full border px-5 active:opacity-80 ${
                    active
                      ? 'border-charcoal bg-charcoal'
                      : 'border-hairline bg-surface'
                  } ${!day ? 'opacity-40' : ''}`}
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
          ) : null}
        </View>
      </ScrollView>

      <View
        className="border-t border-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label="Confirm fitting"
          disabled={!day || !slot}
          onPress={onConfirm}
        />
      </View>
    </View>
  );
}
