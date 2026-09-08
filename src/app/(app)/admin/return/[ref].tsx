import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminHeader } from '@/components/admin/admin-header';
import { BookingCard } from '@/components/booking/booking-card';
import { MUTED } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import {
  useAdminBooking,
  useMarkReturned,
} from '@/features/admin/bookings-hooks';
import { addDays, formatDate, fromKey } from '@/features/booking/dates';

/**
 * Taking an item back, as three plain steps.
 *
 * The cleaning window is shown rather than entered: it was snapshotted onto the
 * booking when it was made, and the dates are already blocked by the booking's
 * range. Presenting it as an editable field would imply a control the shop does
 * not actually have here.
 */
function Step({
  index,
  title,
  done,
  children,
}: {
  index: number;
  title: string;
  done?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <View className="flex-row gap-3">
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${
          done ? 'bg-confirmed' : 'border-hairline bg-surface'
        }`}
      >
        {done ? (
          <Feather name="check" size={14} color="#FFFFFF" />
        ) : (
          <Text className="font-sans-semibold text-xs text-ink">{index}</Text>
        )}
      </View>
      <View className="flex-1 gap-2 pb-1">
        <Text className="font-sans-medium text-base text-ink">{title}</Text>
        {children}
      </View>
    </View>
  );
}

export default function ProcessReturn() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { data: booking, isLoading } = useAdminBooking(ref);
  const markReturned = useMarkReturned();

  const [confirmed, setConfirmed] = useState(false);
  const [condition, setCondition] = useState<'good' | 'attention' | null>(null);

  if (isLoading || !booking) {
    return (
      <View className="flex-1 bg-canvas">
        <AdminHeader title="Process return" onBack={() => router.back()} />
      </View>
    );
  }

  const ret = fromKey(booking.ret);
  const cleanFrom = addDays(ret, 1);
  const cleanTo = addDays(ret, booking.cleaningDays);
  const bookableAgain = addDays(ret, booking.cleaningDays + 1);
  const ready = confirmed && condition !== null;

  function submit() {
    markReturned.mutate(
      { reference: booking!.ref, needsAttention: condition === 'attention' },
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
      <AdminHeader title="Process return" onBack={() => router.back()} />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <BookingCard
          name={booking.itemName}
          photo={booking.itemPhoto}
          pickup={booking.pickup}
          ret={booking.ret}
          days={booking.days}
        />
        <Text className="font-sans text-sm text-muted">
          Rented by {booking.customerName}
        </Text>

        <View className="gap-5">
          <Step index={1} title="Confirm the item is back" done={confirmed}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: confirmed }}
              onPress={() => setConfirmed((c) => !c)}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 active:opacity-80 ${
                confirmed
                  ? 'border-confirmed bg-confirmed-soft'
                  : 'border-hairline bg-surface'
              }`}
            >
              <Feather
                name={confirmed ? 'check-square' : 'square'}
                size={18}
                color={confirmed ? '#1F7A45' : MUTED}
              />
              <Text
                className={`font-sans-medium text-sm ${confirmed ? 'text-confirmed' : 'text-ink'}`}
              >
                {booking.itemName} is physically back in the shop
              </Text>
            </Pressable>
          </Step>

          <Step index={2} title="Cleaning period" done={confirmed}>
            <View className="gap-1 rounded-2xl bg-cleaning-soft p-4">
              {booking.cleaningDays > 0 ? (
                <>
                  <Text className="font-sans-medium text-sm text-cleaning">
                    {formatDate(cleanFrom)} – {formatDate(cleanTo)}
                  </Text>
                  <Text className="font-sans text-xs text-cleaning">
                    Already blocked. Bookable again from{' '}
                    {formatDate(bookableAgain)}.
                  </Text>
                </>
              ) : (
                <Text className="font-sans text-sm text-cleaning">
                  This item has no cleaning buffer — it is bookable again
                  immediately.
                </Text>
              )}
            </View>
          </Step>

          <Step index={3} title="Condition" done={condition !== null}>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Good"
                  variant={condition === 'good' ? 'primary' : 'outline'}
                  onPress={() => setCondition('good')}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Needs attention"
                  variant={condition === 'attention' ? 'commit' : 'outline'}
                  onPress={() => setCondition('attention')}
                />
              </View>
            </View>
            {condition === 'attention' ? (
              <Text className="font-sans text-xs leading-5 text-muted">
                This copy will be marked damaged and taken out of the calendar
                until someone clears it. Recording photos and repair costs
                arrives with damage monitoring in v2.
              </Text>
            ) : null}
          </Step>
        </View>
      </ScrollView>

      <View
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label="Mark as returned"
          disabled={!ready}
          loading={markReturned.isPending}
          onPress={submit}
        />
        {!ready ? (
          <Text className="pt-2 text-center font-sans text-xs text-muted">
            Confirm the item is back and set its condition first.
          </Text>
        ) : null}
      </View>
    </View>
  );
}
