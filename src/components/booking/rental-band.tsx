import { Text, View } from 'react-native';

import {
  BRONZE,
  HAIRLINE,
  INK,
  MUTED,
} from '@/components/catalog/catalog-style';
import {
  addDays,
  daysBetween,
  formatDayMonth,
  sameDay,
} from '@/features/booking/dates';

/**
 * The rental band — the signature element of this design (see DESIGN.md).
 *
 * A rental is a span of time that ends with the item coming back, not a
 * checkout, so it is drawn as one continuous strip:
 *
 *   - a solid bronze segment across the rental days, with filled markers at
 *     pickup and return
 *   - a dotted tail for the cleaning days, which are blocked but not booked —
 *     texture, not just hue, so the difference survives colour-blindness
 *   - a hairline for today
 *   - a hollow marker drawn OFF the band for a fitting, because a fitting does
 *     not hold the item
 *
 * `sm` is unlabelled for list rows; `md` and `lg` label the dates.
 */

type Size = 'sm' | 'md' | 'lg';

const DOT: Record<Size, number> = { sm: 7, md: 9, lg: 11 };
const RAIL: Record<Size, number> = { sm: 2, md: 2, lg: 3 };

export function RentalBand({
  pickup,
  ret,
  cleaningDays = 0,
  fitting,
  today,
  size = 'md',
}: {
  pickup: Date;
  ret: Date;
  /** Days blocked after return before the item can be re-rented. */
  cleaningDays?: number;
  /** Optional fitting appointment — drawn detached, ahead of the band. */
  fitting?: Date | null;
  today?: Date;
  size?: Size;
}) {
  const rentalDays = Math.max(0, daysBetween(pickup, ret));
  const days: { date: Date; kind: 'rental' | 'cleaning' }[] = [];
  for (let i = 0; i <= rentalDays; i++) {
    days.push({ date: addDays(pickup, i), kind: 'rental' });
  }
  for (let i = 1; i <= cleaningDays; i++) {
    days.push({ date: addDays(ret, i), kind: 'cleaning' });
  }

  const dot = DOT[size];
  const rail = RAIL[size];
  const labelled = size !== 'sm';

  return (
    <View className="w-full gap-2">
      {fitting ? (
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              borderWidth: 1.5,
              borderColor: MUTED,
            }}
          />
          <Text className="font-sans text-xs text-muted">
            Fitting {formatDayMonth(fitting)} — does not hold the item
          </Text>
        </View>
      ) : null}

      <View className="w-full flex-row items-center">
        {days.map((d, i) => {
          const isEnd = i === 0 || i === rentalDays;
          const isCleaning = d.kind === 'cleaning';
          const isToday = today ? sameDay(d.date, today) : false;
          const nextIsCleaning =
            i < days.length - 1 && days[i + 1].kind === 'cleaning';
          return (
            <View key={i} className="flex-1 items-center">
              <View className="w-full flex-row items-center">
                <View
                  style={{
                    flex: 1,
                    height: rail,
                    backgroundColor:
                      i === 0 || isCleaning ? 'transparent' : BRONZE,
                  }}
                />
                {isEnd && !isCleaning ? (
                  <View
                    style={{
                      width: dot,
                      height: dot,
                      borderRadius: dot / 2,
                      backgroundColor: BRONZE,
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: dot * 0.55,
                      height: dot * 0.55,
                      borderRadius: dot,
                      backgroundColor: isCleaning ? HAIRLINE : BRONZE,
                    }}
                  />
                )}
                <View
                  style={{
                    flex: 1,
                    height: rail,
                    backgroundColor:
                      i === days.length - 1 || nextIsCleaning
                        ? 'transparent'
                        : BRONZE,
                  }}
                />
              </View>
              {isToday ? (
                <View
                  style={{
                    position: 'absolute',
                    top: -6,
                    height: 16,
                    width: 1,
                    backgroundColor: INK,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {labelled ? (
        <View className="w-full flex-row">
          {days.map((d, i) => (
            <View key={i} className="flex-1 items-center">
              <Text
                numberOfLines={1}
                className={`text-[10px] ${
                  d.kind === 'cleaning'
                    ? 'font-sans text-muted'
                    : 'font-sans-medium text-ink'
                }`}
              >
                {formatDayMonth(d.date)}
              </Text>
              {i === 0 ? (
                <Text className="font-sans text-[10px] text-muted">Pickup</Text>
              ) : i === rentalDays ? (
                <Text className="font-sans text-[10px] text-muted">Return</Text>
              ) : i === rentalDays + 1 ? (
                <Text className="font-sans text-[10px] text-muted">
                  Cleaning
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The band's legend. Shown wherever the band appears at full size. */
export function RentalBandLegend() {
  return (
    <View className="flex-row flex-wrap items-center gap-x-4 gap-y-2">
      {[
        { color: BRONZE, label: 'Rental period' },
        { color: HAIRLINE, label: 'Cleaning (blocked)' },
        { color: INK, label: 'Today' },
      ].map((l) => (
        <View key={l.label} className="flex-row items-center gap-1.5">
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: l.color,
            }}
          />
          <Text className="font-sans text-xs text-muted">{l.label}</Text>
        </View>
      ))}
      <View className="flex-row items-center gap-1.5">
        <View
          style={{
            width: 8,
            height: 8,
            borderRadius: 4,
            borderWidth: 1.5,
            borderColor: MUTED,
          }}
        />
        <Text className="font-sans text-xs text-muted">Fitting (separate)</Text>
      </View>
    </View>
  );
}
