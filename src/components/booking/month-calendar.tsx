import { Feather } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { INK } from '@/components/catalog/catalog-style';
import type { DayStateMap } from '@/features/booking/api';
import {
  WEEKDAYS,
  daysBetween,
  formatMonth,
  monthMatrix,
  sameDay,
  toKey,
} from '@/features/booking/dates';

/**
 * The customer-facing availability calendar.
 *
 * The shop tracks six inventory states; a customer only needs three — bookable,
 * unavailable, or in cleaning — plus the range they are choosing. The admin
 * calendar is where the full diagnosis lives.
 *
 * Selection is two taps: pickup, then return. Tapping a day before the current
 * pickup (or any day once a range is complete) starts a new range.
 */

type Selection = { pickup: Date | null; ret: Date | null };

export function MonthCalendar({
  today,
  selection,
  onChange,
  states,
  unknownDay = 'unavailable',
  onMonthChange,
}: {
  today: Date;
  selection: Selection;
  onChange: (s: Selection) => void;
  /** Per-day availability for the visible window, keyed 'YYYY-MM-DD'. */
  states?: DayStateMap;
  /**
   * How to read a day the `states` map says nothing about.
   *
   * Defaults to 'unavailable' so the rental picker never offers a slot it
   * cannot vouch for. The fitting picker passes 'available': a fitting is a
   * visit to the shop, not a rental, so stock availability is irrelevant and it
   * needs no map at all.
   */
  unknownDay?: 'available' | 'unavailable';
  /** Fired when the visible month changes so the parent can fetch it. */
  onMonthChange?: (year: number, month: number) => void;
}) {
  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const rows = useMemo(
    () => monthMatrix(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );

  function step(delta: number) {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  }

  // Notify the parent only when the visible month actually changes.
  //
  // `onMonthChange` is typically an inline arrow, so it has a new identity on
  // every parent render. With it in the dep array, the effect re-fired, the
  // parent set state, that re-rendered the parent, which produced a new arrow —
  // an unbounded loop that re-rendered this 42-cell grid forever without ever
  // looking broken. The ref holds the last month we reported, so the callback's
  // identity no longer participates.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    const key = `${cursor.year}-${cursor.month}`;
    if (reported.current === key) return;
    reported.current = key;
    onMonthChange?.(cursor.year, cursor.month);
  });

  function pick(date: Date) {
    const { pickup, ret } = selection;
    if (!pickup || ret) {
      onChange({ pickup: date, ret: null });
      return;
    }
    if (daysBetween(pickup, date) < 0) {
      onChange({ pickup: date, ret: null });
      return;
    }
    onChange({ pickup, ret: date });
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <Text className="font-display-semibold text-xl text-ink">
          {formatMonth(cursor.year, cursor.month)}
        </Text>
        <View className="flex-row gap-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Previous month"
            onPress={() => step(-1)}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-full border border-hairline active:opacity-70"
          >
            <Feather name="chevron-left" size={17} color={INK} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Next month"
            onPress={() => step(1)}
            hitSlop={6}
            className="h-9 w-9 items-center justify-center rounded-full border border-hairline active:opacity-70"
          >
            <Feather name="chevron-right" size={17} color={INK} />
          </Pressable>
        </View>
      </View>

      <View className="flex-row">
        {WEEKDAYS.map((w) => (
          <View key={w} className="flex-1 items-center">
            <Text className="font-sans-medium text-[11px] text-muted">{w}</Text>
          </View>
        ))}
      </View>

      <View className="gap-1.5">
        {rows.map((row, ri) => (
          <View key={ri} className="flex-row">
            {row.map((date, ci) => {
              if (!date) return <View key={ci} className="flex-1 py-1" />;

              const past = daysBetween(today, date) < 0;
              const state = past
                ? 'past'
                : (states?.[toKey(date)] ?? unknownDay);
              const { pickup, ret } = selection;
              const isPickup = pickup ? sameDay(date, pickup) : false;
              const isReturn = ret ? sameDay(date, ret) : false;
              const inRange =
                pickup && ret
                  ? daysBetween(pickup, date) >= 0 &&
                    daysBetween(date, ret) >= 0
                  : false;
              const isToday = sameDay(date, today);
              const disabled = state === 'past' || state === 'unavailable';

              let fill = '';
              let textClass = 'font-sans text-sm text-ink';

              if (isPickup || isReturn) {
                fill = 'bg-bronze';
                textClass = 'font-sans-semibold text-sm text-white';
              } else if (inRange) {
                fill = 'bg-bronze-soft';
                textClass = 'font-sans-medium text-sm text-ink';
              } else if (state === 'past') {
                textClass = 'font-sans text-sm text-muted opacity-40';
              } else if (state === 'unavailable') {
                textClass = 'font-sans text-sm text-muted opacity-50';
              } else if (state === 'cleaning') {
                fill = 'bg-cleaning-soft';
                textClass = 'font-sans text-sm text-cleaning';
              } else {
                fill = 'bg-confirmed-soft';
                textClass = 'font-sans-medium text-sm text-confirmed';
              }

              return (
                <View key={ci} className="flex-1 items-center py-1">
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{
                      disabled,
                      selected: isPickup || isReturn || inRange,
                    }}
                    accessibilityLabel={`${toKey(date)}, ${
                      disabled ? 'unavailable' : state
                    }`}
                    disabled={disabled}
                    onPress={() => pick(date)}
                    className={`h-10 w-10 items-center justify-center rounded-full ${fill} ${
                      isToday && !isPickup && !isReturn
                        ? 'border border-ink'
                        : ''
                    }`}
                  >
                    <Text className={textClass}>{date.getDate()}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

/** The legend. Permanent under the calendar — this is where it earns its space. */
export function CalendarLegend() {
  const items = [
    { className: 'bg-confirmed-soft', label: 'Available' },
    { className: 'bg-canvas-subtle', label: 'Unavailable' },
    { className: 'bg-cleaning-soft', label: 'In cleaning' },
    { className: 'bg-bronze', label: 'Selected range' },
  ];
  return (
    <View className="flex-row flex-wrap gap-x-5 gap-y-2">
      {items.map((i) => (
        <View key={i.label} className="flex-row items-center gap-2">
          <View className={`h-3.5 w-3.5 rounded-full ${i.className}`} />
          <Text className="font-sans text-xs text-muted">{i.label}</Text>
        </View>
      ))}
      <View className="flex-row items-center gap-2">
        <View className="h-3.5 w-3.5 rounded-full border border-ink" />
        <Text className="font-sans text-xs text-muted">Today</Text>
      </View>
    </View>
  );
}
