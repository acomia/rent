import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { FlowHeader } from '@/components/booking/flow-header';
import { Button } from '@/components/ui/button';
import { useBookingByRef } from '@/features/booking/hooks';
import { daysBetween, fromKey } from '@/features/booking/dates';

/** Screen 21 — after the item comes back. */
export default function Thanks() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking } = useBookingByRef(id);

  if (!booking) {
    return (
      <View className="flex-1 bg-canvas">
        <FlowHeader />
      </View>
    );
  }

  const days = daysBetween(fromKey(booking.pickup), fromKey(booking.ret)) + 1;

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <View className="flex-1 items-center justify-center gap-5 px-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-confirmed">
          <Feather name="check" size={28} color="#FFFFFF" />
        </View>
        <Text className="text-center font-display-bold text-3xl text-ink">
          Thank you!
        </Text>
        <Text className="text-center font-sans text-base leading-6 text-muted">
          We hope you had a great time. See you on your next occasion.
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
      </View>

      <View
        className="gap-3 px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label="Book again"
          onPress={() =>
            router.push({
              pathname: '/(app)/product/[id]',
              params: { id: booking.itemId },
            })
          }
        />
        <Button label="View receipt" variant="outline" />
      </View>
    </View>
  );
}
