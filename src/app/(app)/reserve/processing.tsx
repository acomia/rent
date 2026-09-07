import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowStepper } from '@/components/booking/flow-stepper';
import { BRONZE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { useCreateBooking } from '@/features/booking/hooks';

const STEPS = ['Connecting', 'Processing', 'Finalizing'];

/**
 * Screen 15 — the reservation is written here.
 *
 * This is where the booking is created, not on the success screen: it is the
 * moment payment completes, and in Phase 5 it becomes the PayMongo webhook that
 * marks the deposit paid. Doing it here also means a failure — someone else took
 * the slot a second earlier — surfaces before the customer is told they're done.
 */
export default function Processing() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, clearDraft } = useBooking();
  const create = useCreateBooking();
  const [step, setStep] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const a = setTimeout(() => setStep(1), 900);
    const b = setTimeout(() => setStep(2), 1800);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);

  useEffect(() => {
    if (started.current || !draft?.pickup || !draft.ret) return;
    started.current = true;
    create.mutate(
      {
        itemId: draft.itemId,
        pickup: draft.pickup,
        ret: draft.ret,
        fulfillment: draft.fulfillment ?? 'pickup',
        fittingAt: draft.fittingAt,
        size: draft.size,
      },
      {
        onSuccess: (reference) => {
          clearDraft();
          router.replace({
            pathname: '/(app)/reserve/success',
            params: { ref: reference },
          });
        },
      },
    );
  }, [draft, create, router, clearDraft]);

  if (create.isError) {
    return (
      <View className="flex-1 bg-canvas">
        <View className="flex-1 items-center justify-center gap-5 px-8">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-overdue-soft">
            <Feather name="alert-circle" size={28} color="#A83232" />
          </View>
          <Text className="text-center font-display-bold text-2xl text-ink">
            We couldn&apos;t reserve these dates
          </Text>
          <Text className="text-center font-sans text-base leading-6 text-muted">
            {create.error instanceof Error
              ? create.error.message
              : 'Something went wrong. Please try again.'}
          </Text>
        </View>
        <View
          className="gap-3 px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <Button
            label="Pick different dates"
            onPress={() => router.replace('/(app)/reserve/dates')}
          />
        </View>
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
