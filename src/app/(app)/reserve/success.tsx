import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { Button } from '@/components/ui/button';
import { useBookingByRef } from '@/features/booking/hooks';
import { daysBetween, fromKey } from '@/features/booking/dates';
import { formatPeso } from '@/features/catalog/types';

/** Screen 16 — the deposit landed. The emotional payoff of the flow. */
export default function Success() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref?: string }>();
  const { data: booking } = useBookingByRef(ref);
  if (!booking) return <View className="flex-1 bg-canvas" />;

  const days = daysBetween(fromKey(booking.pickup), fromKey(booking.ret)) + 1;

  return (
    <View className="flex-1 bg-canvas">
      <View className="flex-1 items-center justify-center gap-5 px-6">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-confirmed">
          <Feather name="check" size={34} color="#FFFFFF" />
        </View>
        <Text className="text-center font-display-bold text-3xl text-ink">
          Payment successful!
        </Text>
        <Text className="font-display-bold text-5xl text-ink">
          {formatPeso(booking.paidOnline)}
        </Text>
        <Text className="text-center font-sans text-base text-muted">
          Your dates are confirmed.
        </Text>
        <View className="w-full pt-2">
          <BookingCard
            name={booking.itemName}
            photo={booking.itemPhoto}
            pickup={booking.pickup}
            ret={booking.ret}
            days={days}
          />
        </View>
        <Text className="text-center font-sans text-sm text-muted">
          You&apos;ll pay {formatPeso(booking.quote.balanceAtPickup)} at the
          shop when you pick up.
        </Text>
      </View>

      <View
        className="gap-3 px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label="View booking"
          onPress={() =>
            router.replace({
              pathname: '/(app)/reserve/confirmed',
              params: { ref: booking.ref },
            })
          }
        />
        {/*
          Disabled until Phase 5: nothing has actually been paid yet, so there
          is no receipt to render. A button that silently does nothing on tap
          reads as a broken app rather than an unfinished one.
        */}
        <Button label="View receipt" variant="outline" disabled />
      </View>
    </View>
  );
}
