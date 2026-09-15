import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowStepper } from '@/components/booking/flow-stepper';
import { BRONZE, OVERDUE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { useHoldStatus } from '@/features/booking/hooks';

const STEPS = ['Connecting', 'Processing', 'Finalizing'];
const TIMEOUT_MS = 45_000;

/**
 * Screen 15 — waits for `paymongo-webhook` to advance the hold.
 *
 * This screen does NOT write the booking — it already exists as a `hold`
 * (Phase 4/5). Only the webhook may move it off `hold`, so this polls rather
 * than assumes: a slow webhook is not the same as a failed payment.
 */
export default function Processing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, clearDraft } = useBooking();
  const [step, setStep] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const bookingId = draft?.bookingId ?? null;
  const status = useHoldStatus(bookingId, { enabled: Boolean(bookingId) });

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 900);
    const b = setTimeout(() => setStep(2), 1800);
    const timeout = setTimeout(() => setTimedOut(true), TIMEOUT_MS);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (status.data === 'pending' && draft?.reference) {
      const ref = draft.reference;
      clearDraft();
      router.replace({ pathname: '/(app)/reserve/success', params: { ref } });
    }
  }, [status.data, draft?.reference, clearDraft, router]);

  if (!bookingId) {
    return (
      <View className="flex-1 bg-canvas">
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center font-sans text-base text-muted">
            Nothing to confirm — start a reservation first.
          </Text>
        </View>
      </View>
    );
  }

  const failed =
    (status.data === 'failed' || status.data === 'gone') && !status.isFetching;

  if (failed) {
    return (
      <View className="flex-1 bg-canvas">
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-overdue-soft">
            <Feather name="alert-circle" size={28} color={OVERDUE} />
          </View>
          <Text className="text-center font-display-bold text-2xl text-ink">
            Your payment didn&apos;t go through
          </Text>
          <Text className="text-center font-sans text-base leading-6 text-muted">
            Nothing was charged. You can try a different payment method — your
            dates are still held.
          </Text>
        </View>
        <View
          className="gap-3 px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            label="Try again"
            onPress={() => router.replace('/(app)/reserve/payment')}
          />
        </View>
      </View>
    );
  }

  if (timedOut) {
    return (
      <View className="flex-1 items-center justify-center gap-7 bg-canvas px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-bronze-soft">
          <Feather name="clock" size={30} color={BRONZE} />
        </View>
        <View className="gap-2">
          <Text className="text-center font-display-bold text-2xl text-ink">
            Still confirming your payment
          </Text>
          <Text className="text-center font-sans text-base leading-6 text-muted">
            This is taking longer than usual. We&apos;ll update your booking as
            soon as it&apos;s confirmed — check My Bookings shortly.
          </Text>
        </View>
        <Button
          label="Go to My Bookings"
          onPress={() => router.replace('/(app)/(tabs)/bookings')}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 items-center justify-center gap-7 bg-canvas px-8">
      <View className="h-20 w-20 items-center justify-center rounded-full bg-bronze-soft">
        <Feather name="credit-card" size={30} color={BRONZE} />
      </View>
      <View className="gap-2">
        <Text className="text-center font-display-bold text-2xl text-ink">
          Completing your payment
        </Text>
        <Text className="text-center font-sans text-base leading-6 text-muted">
          Please do not close the app. This will only take a moment.
        </Text>
      </View>
      <FlowStepper steps={STEPS} current={step} />
    </View>
  );
}
