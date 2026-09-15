import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BookingCard } from '@/components/booking/booking-card';
import { FlowHeader, NoDraft } from '@/components/booking/flow-header';
import { BRONZE } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { useBooking } from '@/features/booking/booking-context';
import { daysBetween, fromKey } from '@/features/booking/dates';
import { useCreateHold } from '@/features/booking/hooks';

/**
 * Screen 13 — the slot hold.
 *
 * A real `hold` row (implementation-plan Phase 5), not a client-side timer:
 * the countdown is derived from the server's `hold_expires_at`, since only
 * the DB's clock is the one `expire_stale_holds()` actually checks.
 */
export default function Hold() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { draft, setHold } = useBooking();
  const create = useCreateHold();
  const started = useRef(false);
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    if (started.current || !draft?.pickup || !draft.ret || draft.bookingId)
      return;
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
        onSuccess: (hold) =>
          setHold({
            bookingId: hold.id,
            reference: hold.reference,
            holdExpiresAt: hold.holdExpiresAt,
          }),
        onError: (e) =>
          Alert.alert(
            'Those dates just got taken',
            e instanceof Error ? e.message : 'Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(app)/reserve/dates'),
              },
            ],
          ),
      },
    );
  }, [draft, create, router, setHold]);

  useEffect(() => {
    if (!draft?.holdExpiresAt) return;
    const tick = () => {
      const ms = new Date(draft.holdExpiresAt as string).getTime() - Date.now();
      setLeft(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [draft?.holdExpiresAt]);

  if (!draft?.pickup || !draft.ret) {
    return <NoDraft />;
  }

  const days = daysBetween(fromKey(draft.pickup), fromKey(draft.ret)) + 1;
  const waiting = left === null;
  const expired = left === 0;
  const mm = waiting
    ? '--'
    : `${Math.floor((left as number) / 60)}`.padStart(2, '0');
  const ss = waiting ? '--' : `${(left as number) % 60}`.padStart(2, '0');

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader />
      <View className="flex-1 items-center gap-6 px-6 pt-6">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-bronze-soft">
          <Feather
            name={expired ? 'refresh-cw' : 'clock'}
            size={26}
            color={BRONZE}
          />
        </View>

        {expired ? (
          <>
            <Text className="text-center font-display-bold text-3xl leading-tight text-ink">
              Your hold expired
            </Text>
            <Text className="text-center font-sans text-base leading-6 text-muted">
              Nobody has taken these dates yet. Check them again to carry on.
            </Text>
          </>
        ) : (
          <>
            <Text className="text-center font-display-bold text-3xl leading-tight text-ink">
              Your dates are reserved
            </Text>
            <Text className="font-display-bold text-5xl text-ink">
              {mm}:{ss}
            </Text>
            <Text className="text-center font-sans text-base leading-6 text-muted">
              Complete your payment to confirm your booking.
            </Text>
          </>
        )}

        <View className="w-full">
          <BookingCard
            name={draft.itemName}
            photo={draft.itemPhoto}
            pickup={draft.pickup}
            ret={draft.ret}
            days={days}
          />
        </View>
      </View>

      <View
        className="border-t-hairline px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <Button
          label={expired ? 'Check dates again' : 'Pay now'}
          disabled={waiting}
          loading={create.isPending}
          onPress={() =>
            expired
              ? router.replace('/(app)/reserve/dates')
              : router.push('/(app)/reserve/payment')
          }
        />
      </View>
    </View>
  );
}
