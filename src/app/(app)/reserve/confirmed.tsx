import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { PaidBlock } from '@/components/booking/money-block';
import { BRONZE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBookingByRef } from '@/features/booking/hooks';
import { daysBetween, fromKey } from '@/features/booking/dates';

/** Screen 17 — you're all set. The last screen of the reserve flow. */
export default function Confirmed() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { data: booking } = useBookingByRef(ref);

  if (!booking) return <View className="flex-1 bg-canvas" />;

  const days = daysBetween(fromKey(booking.pickup), fromKey(booking.ret)) + 1;

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-1 items-center justify-center gap-5 px-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-bronze-soft">
          <Feather name="award" size={28} color={BRONZE} />
        </View>
        <Text className="text-center font-display-bold text-3xl text-ink">
          You&apos;re all set!
        </Text>
        <Text className="text-center font-sans text-base leading-6 text-muted">
          A confirmation has been sent to your email.
        </Text>

        <View className="w-full gap-4 pt-2">
          <BookingCard
            name={booking.itemName}
            photo={booking.itemPhoto}
            pickup={booking.pickup}
            ret={booking.ret}
            days={days}
          />
          <PaidBlock
            paid={booking.paidOnline}
            balance={booking.quote.balanceAtPickup}
          />
        </View>
      </View>

      <View className="px-5 pt-4" style={{ paddingBottom: insets.bottom + 12 }}>
        <Button
          label="View my bookings"
          onPress={() => router.replace('/(app)/(tabs)/bookings')}
        />
      </View>
    </View>
  );
}
