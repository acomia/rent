import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { BookingCard } from '@/components/booking/booking-card';
import { FlowHeader } from '@/components/booking/flow-header';
import { PickupCode } from '@/components/booking/pickup-code';
import { useBookingByRef } from '@/features/booking/hooks';
import { daysBetween, fromKey } from '@/features/booking/dates';
import { formatPeso } from '@/features/catalog/types';

/** Screen 20 — what the customer shows at the counter. */
export default function Pickup() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking } = useBookingByRef(id);

  if (!booking) {
    return (
      <View className="flex-1 bg-canvas">
        <FlowHeader title="Pickup" />
      </View>
    );
  }

  const days = daysBetween(fromKey(booking.pickup), fromKey(booking.ret)) + 1;

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <ScrollView
        contentContainerClassName="items-center gap-5 px-6 pb-8"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display-bold text-3xl text-ink">
          Ready for pickup
        </Text>
        <Text className="font-sans text-base text-muted">
          Show this to our staff.
        </Text>

        <PickupCode reference={booking.ref} />

        <Text className="font-sans-medium text-sm text-ink">
          Booking #{booking.ref}
        </Text>

        <View className="w-full">
          <BookingCard
            name={booking.itemName}
            photo={booking.itemPhoto}
            pickup={booking.pickup}
            ret={booking.ret}
            days={days}
          />
        </View>

        <View className="w-full flex-row items-center justify-between rounded-2xl bg-pending-soft p-4">
          <Text className="font-sans-medium text-sm text-pending">
            Due at pickup
          </Text>
          <Text className="font-sans-bold text-base text-pending">
            {formatPeso(booking.quote.balanceAtPickup)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
