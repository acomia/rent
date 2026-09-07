import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/booking/flow-header';
import {
  PAYMENT_METHODS,
  PaymentMethodRow,
} from '@/components/booking/payment-method-row';
import { MUTED } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { daysBetween, fromKey } from '@/features/booking/dates';
import { quote } from '@/features/booking/pricing';
import { formatPeso } from '@/features/catalog/types';

/** Screen 14 — payment method. */
export default function Payment() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft } = useBooking();
  const [method, setMethod] = useState<string>('gcash');

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
  const q = quote({
    pricePerDay: draft.pricePerDay,
    deposit: draft.deposit,
    days,
  });

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-6"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-display-bold text-3xl leading-tight text-ink">
          Select a payment method
        </Text>

        <View className="gap-3">
          {PAYMENT_METHODS.map((m) => (
            <PaymentMethodRow
              key={m.id}
              name={m.name}
              descriptor={m.descriptor}
              mark={m.mark || '💳'}
              markColor={m.markColor}
              selected={method === m.id}
              onPress={() => setMethod(m.id)}
            />
          ))}
        </View>

        <View className="flex-row items-center gap-2">
          <Feather name="lock" size={14} color={MUTED} />
          <Text className="font-sans text-xs text-muted">
            Payments are secure and encrypted.
          </Text>
        </View>
      </ScrollView>

      <View
        className="border-t border-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={`Pay ${formatPeso(q.totalNow)}`}
          onPress={() => router.push('/(app)/reserve/processing')}
        />
      </View>
    </View>
  );
}
