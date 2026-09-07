import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { FlowHeader } from '@/components/booking/flow-header';
import { BRONZE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { daysBetween, fromKey } from '@/features/booking/dates';

const HOLD_SECONDS = 15 * 60;

/**
 * Screen 13 — the slot hold.
 *
 * A pending hold expires so a slot is not taken twice while someone heads to
 * payment (implementation-plan Phase 4). The expired state offers to re-check
 * the dates and never blames the customer.
 */
export default function Hold() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft } = useBooking();
  const [left, setLeft] = useState(HOLD_SECONDS);

  useEffect(() => {
    const t = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!draft?.pickup || !draft.ret) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-8">
        <Text className="text-center font-sans text-base text-muted">
          Choose your dates first.
        </Text>
      </View>
    );
  }

  const days = daysBetween(fromKey(draft.pickup), fromKey(draft.ret)) + 1;
  const expired = left === 0;
  const mm = `${Math.floor(left / 60)}`.padStart(2, '0');
  const ss = `${left % 60}`.padStart(2, '0');

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <View className="flex-1 items-center gap-6 px-6 pt-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-bronze-soft">
          <Feather
            name={expired ? 'refresh-cw' : 'clock'}
            size={26}
            color={BRONZE}
          />
        </View>

        {expired ? (
          <>
            <Text className="text-center font-display-bold text-3xl leading-tight text-ink">
              Your hold expired
            </Text>
            <Text className="text-center font-sans text-base leading-6 text-muted">
              Nobody has taken these dates yet. Check them again to carry on.
            </Text>
          </>
        ) : (
          <>
            <Text className="text-center font-display-bold text-3xl leading-tight text-ink">
              Your dates are reserved
            </Text>
            <Text className="font-display-bold text-5xl text-ink">
              {mm}:{ss}
            </Text>
            <Text className="text-center font-sans text-base leading-6 text-muted">
              Complete your payment to confirm your booking.
            </Text>
          </>
        )}

        <View className="w-full">
          <BookingCard
            name={draft.itemName}
            photo={draft.itemPhoto}
            pickup={draft.pickup}
            ret={draft.ret}
            days={days}
          />
        </View>
      </View>

      <View
        className="border-t border-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={expired ? 'Check dates again' : 'Pay now'}
          onPress={() =>
            expired
              ? router.replace('/(app)/reserve/dates')
              : router.push('/(app)/reserve/payment')
          }
        />
      </View>
    </View>
  );
}
