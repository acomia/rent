import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { DisclosureRow } from '@/components/booking/disclosure-row';
import { FlowHeader } from '@/components/booking/flow-header';
import { PaidBlock } from '@/components/booking/money-block';
import { RentalBand } from '@/components/booking/rental-band';
import { Button } from '@/components/ui/button';
import { CUSTOMER_STATUS, StatusBadge } from '@/components/ui/status-badge';
import { today as todayFn } from '@/features/booking/availability';
import { useBookingByRef, useCancelBooking } from '@/features/booking/hooks';
import {
  daysBetween,
  formatDate,
  formatTime,
  fromKey,
} from '@/features/booking/dates';

/** Screen 19 — booking detail. */
export default function BookingDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: booking, isLoading } = useBookingByRef(id);
  const cancel = useCancelBooking();
  const today = todayFn();

  if (isLoading) return <View className="flex-1 bg-canvas" />;
  if (!booking) {
    return (
      <View className="flex-1 bg-canvas">
        <FlowHeader title="Booking" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-sans text-base text-muted">
            We couldn&apos;t find that booking.
          </Text>
        </View>
      </View>
    );
  }

  const days = daysBetween(fromKey(booking.pickup), fromKey(booking.ret)) + 1;
  const cancellable =
    booking.status === 'confirmed' || booking.status === 'pending';

  function confirmCancel() {
    Alert.alert(
      'Cancel this booking?',
      'Your dates will be released for other customers. Refund of the deposit follows our cancellation terms.',
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => {
            cancel.mutate(booking!.ref);
            router.back();
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Booking" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <BookingCard
          name={booking.itemName}
          photo={booking.itemPhoto}
          pickup={booking.pickup}
          ret={booking.ret}
          days={days}
          right={<StatusBadge status={CUSTOMER_STATUS[booking.status]} />}
        />

        <RentalBand
          pickup={fromKey(booking.pickup)}
          ret={fromKey(booking.ret)}
          cleaningDays={booking.cleaningDays}
          fitting={booking.fittingAt ? new Date(booking.fittingAt) : null}
          today={today}
          size="lg"
        />

        <PaidBlock
          paid={booking.paidOnline}
          balance={booking.quote.balanceAtPickup}
        />

        <View className="gap-2">
          <DisclosureRow
            icon="calendar"
            label="Rental details"
            value={`${days} days`}
          />
          {booking.fittingAt ? (
            <DisclosureRow
              icon="clock"
              label="Fitting appointment"
              value={`${formatDate(new Date(booking.fittingAt))}, ${formatTime(new Date(booking.fittingAt))}`}
            />
          ) : null}
          <DisclosureRow
            icon="credit-card"
            label="Payment details"
            value={
              booking.payment === 'deposit_paid' ? 'Deposit paid' : 'Settled'
            }
          />
          <DisclosureRow icon="file-text" label="Cancellation terms" />
          {cancellable ? (
            <DisclosureRow
              icon="x-circle"
              label="Cancel booking"
              destructive
              onPress={confirmCancel}
            />
          ) : null}
        </View>
      </ScrollView>

      {booking.status === 'confirmed' ? (
        <View
          className="border-t border-hairline px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            label="Show pickup code"
            onPress={() =>
              router.push({
                pathname: '/(app)/bookings/[id]/pickup',
                params: { id: booking.ref },
              })
            }
          />
        </View>
      ) : booking.status === 'completed' ? (
        <View
          className="border-t border-hairline px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            label="View return summary"
            variant="outline"
            onPress={() =>
              router.push({
                pathname: '/(app)/bookings/[id]/thanks',
                params: { id: booking.ref },
              })
            }
          />
        </View>
      ) : null}
    </View>
  );
}
