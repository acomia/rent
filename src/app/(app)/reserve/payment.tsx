import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import {
  PAYMENT_METHODS,
  PaymentMethodRow,
} from '@/components/booking/payment-method-row';
import { MUTED } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { useAuth } from '@/features/auth/auth-context';
import { useCreatePaymentIntent } from '@/features/booking/hooks';
import { quoteFromDraft } from '@/features/booking/pricing';
import { formatPeso } from '@/features/catalog/types';
import {
  attachPaymentMethod,
  createPaymentMethod,
  type PaymentMethodType,
} from '@/lib/paymongo';

const RETURN_URL = 'renta://reserve/payment';

/**
 * `PAYMENT_METHODS` (UI copy) uses ids that predate PayMongo's actual type
 * strings — 'maya' and 'grabpay' rather than 'paymaya' and 'grab_pay'. Map
 * between them here rather than renaming the UI ids, so a typo can't silently
 * ship the wrong `type` to PayMongo's API.
 */
type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];
const METHOD_TYPE: Record<PaymentMethodId, PaymentMethodType> = {
  gcash: 'gcash',
  maya: 'paymaya',
  grabpay: 'grab_pay',
  card: 'card',
};

/** Screen 14 — payment method, then straight into the gateway. */
export default function Payment() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft } = useBooking();
  const { customer } = useAuth();
  const createIntent = useCreatePaymentIntent();
  const [method, setMethod] = useState<PaymentMethodId>('gcash');
  const [submitting, setSubmitting] = useState(false);

  if (!draft?.pickup || !draft.ret || !draft.bookingId) {
    return <NoDraft />;
  }

  const q = quoteFromDraft(draft);
  if (!q) return <NoDraft />;

  async function pay() {
    if (!draft?.bookingId || !customer) return;
    setSubmitting(true);
    try {
      const intent = await createIntent.mutateAsync(draft.bookingId);
      const paymentMethod = await createPaymentMethod({
        type: METHOD_TYPE[method],
        billing: {
          name: customer.full_name,
          email: customer.email ?? '',
          phone: customer.phone_number ?? '',
        },
      });
      const attached = await attachPaymentMethod({
        paymentIntentId: intent.paymentIntentId,
        clientKey: intent.clientKey,
        paymentMethodId: paymentMethod.id,
        returnUrl: RETURN_URL,
      });

      if (attached.redirectUrl) {
        // The promise resolves once PayMongo redirects back to RETURN_URL —
        // no separate deep-link route needed, control returns to this screen.
        await WebBrowser.openAuthSessionAsync(attached.redirectUrl, RETURN_URL);
      }

      router.push('/(app)/reserve/processing');
    } catch (e) {
      Alert.alert(
        'Payment could not be started',
        e instanceof Error ? e.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

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
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={`Pay ${formatPeso(q.totalNow)}`}
          loading={submitting}
          onPress={pay}
        />
      </View>
    </View>
  );
}
