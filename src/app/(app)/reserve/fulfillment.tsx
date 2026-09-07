import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/booking/flow-header';
import { SelectionCard } from '@/components/booking/selection-card';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import type { FulfillmentType } from '@/features/booking/types';

/**
 * Screen 10 — fulfilment. Shop pickup or an in-shop fitting.
 *
 * Delivery is v1.1 and must not appear here at all, not even disabled.
 */
export default function Fulfillment() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setFulfillment } = useBooking();
  const [choice, setChoice] = useState<FulfillmentType>('pickup');

  function onContinue() {
    setFulfillment(choice);
    router.push(
      choice === 'fitting'
        ? '/(app)/reserve/fitting'
        : '/(app)/reserve/summary',
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display-bold text-3xl leading-tight text-ink">
          How will you get it?
        </Text>

        <View className="gap-3">
          <SelectionCard
            title="Shop pickup"
            description="Pick up at our store on your pickup date."
            selected={choice === 'pickup'}
            onPress={() => setChoice('pickup')}
          />
          <SelectionCard
            title="Fitting appointment"
            description="Try it on at our store first. Booking a fitting does not reserve your rental dates."
            selected={choice === 'fitting'}
            onPress={() => setChoice('fitting')}
          />
        </View>
      </ScrollView>

      <View
        className="border-t border-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button label="Continue" onPress={onContinue} />
      </View>
    </View>
  );
}
