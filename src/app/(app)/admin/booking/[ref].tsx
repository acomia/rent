import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AdminHeader } from '@/components/admin/admin-header';
import { ADMIN_STATUS } from '@/components/admin/booking-row';
import { DetailRow } from '@/components/booking/money-block';
import { RentalBand } from '@/components/booking/rental-band';
import { MUTED, PLACEHOLDER } from '@/components/catalog/catalog-style';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import type { AdminAction } from '@/features/admin/bookings-api';
import { actionsFor } from '@/features/admin/bookings-api';
import {
  useAdminBooking,
  useUpdateBookingStatus,
  useUpdateFittingStatus,
} from '@/features/admin/bookings-hooks';
import { today as todayFn } from '@/features/booking/availability';
import { formatDate, formatTime, fromKey } from '@/features/booking/dates';
import { formatPeso } from '@/features/catalog/types';

const ACTION_LABEL: Record<AdminAction, string> = {
  approve: 'Approve booking',
  reject: 'Reject',
  cancel: 'Cancel booking',
  mark_picked_up: 'Mark as picked up',
};

/**
 * The shop's decision screen for one booking.
 *
 * Rejecting requires a reason because that reason is customer-facing — a
 * rejection with no explanation is the thing that turns a lost booking into a
 * lost customer. The reason panel is inline rather than `Alert.prompt`, which is
 * iOS-only and would leave Android without the flow at all.
 */
export default function AdminBookingDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const { data: booking, isLoading } = useAdminBooking(ref);
  const update = useUpdateBookingStatus();
  const fitting = useUpdateFittingStatus();
  const today = todayFn();

  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  if (isLoading || !booking) {
    return (
      <View className="flex-1 bg-canvas">
        <AdminHeader title="Booking" onBack={() => router.back()} />
        {isLoading ? null : (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-center font-sans text-base text-muted">
              We couldn&apos;t find that booking.
            </Text>
          </View>
        )}
      </View>
    );
  }

  const s = ADMIN_STATUS[booking.status];
  const actions = actionsFor(booking.status);

  function run(action: AdminAction) {
    if (action === 'reject') {
      setRejecting(true);
      return;
    }
    const confirmable = action === 'cancel';
    const go = () =>
      update.mutate(
        { reference: booking!.ref, action },
        {
          onError: (e) =>
            Alert.alert(
              'That didn’t go through',
              e instanceof Error ? e.message : 'Please try again.',
            ),
        },
      );

    if (!confirmable) return go();
    Alert.alert(
      'Cancel this booking?',
      'The dates are released for other customers straight away.',
      [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel booking', style: 'destructive', onPress: go },
      ],
    );
  }

  function submitRejection() {
    update.mutate(
      { reference: booking!.ref, action: 'reject', reason },
      {
        onSuccess: () => {
          setRejecting(false);
          setReason('');
        },
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
      <AdminHeader title={booking.ref} onBack={() => router.back()} />

      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 gap-1">
            <Text className="font-display-bold text-2xl text-ink">
              {booking.customerName}
            </Text>
            {booking.customerPhone ? (
              <View className="flex-row items-center gap-1.5">
                <Feather name="phone" size={13} color={MUTED} />
                <Text className="font-sans text-sm text-muted">
                  {booking.customerPhone}
                </Text>
              </View>
            ) : null}
          </View>
          <StatusBadge status={s.tone} label={s.label} />
        </View>

        {booking.rejectionReason ? (
          <View className="gap-1 rounded-2xl bg-overdue-soft p-4">
            <Text className="font-sans-medium text-sm text-overdue">
              Rejected
            </Text>
            <Text className="font-sans text-sm leading-5 text-overdue">
              {booking.rejectionReason}
            </Text>
          </View>
        ) : null}

        <View className="gap-3 rounded-2xl border border-hairline bg-surface p-4">
          <Text className="font-display-semibold text-lg text-ink">
            {booking.itemName}
            {booking.unitSize ? (
              <Text className="font-sans text-sm text-muted">
                {'  '}Size {booking.unitSize}
              </Text>
            ) : null}
          </Text>
          <RentalBand
            pickup={fromKey(booking.pickup)}
            ret={fromKey(booking.ret)}
            cleaningDays={booking.cleaningDays}
            fitting={booking.fittingAt ? new Date(booking.fittingAt) : null}
            today={today}
            size="md"
          />
        </View>

        <View className="divide-y divide-hairline">
          <DetailRow
            label="Pickup"
            value={formatDate(fromKey(booking.pickup))}
          />
          <DetailRow label="Return" value={formatDate(fromKey(booking.ret))} />
          <DetailRow
            label="Days"
            value={`${booking.days} ${booking.days === 1 ? 'day' : 'days'}`}
          />
          <DetailRow
            label="Fulfilment"
            value={
              booking.fulfillment === 'fitting'
                ? 'Fitting first'
                : 'Shop pickup'
            }
          />
          <DetailRow label="Rental fee" value={formatPeso(booking.rentalFee)} />
          <DetailRow
            label="Deposit (refundable)"
            value={formatPeso(booking.deposit)}
          />
        </View>

        {booking.fittingAt ? (
          <View className="gap-3 rounded-2xl border border-hairline bg-surface p-4">
            <View className="gap-0.5">
              <Text className="font-sans-medium text-[11px] uppercase tracking-[2px] text-muted">
                Fitting appointment
              </Text>
              <Text className="font-sans-medium text-base text-ink">
                {formatDate(new Date(booking.fittingAt))} ·{' '}
                {formatTime(new Date(booking.fittingAt))}
              </Text>
              <Text className="font-sans text-xs text-muted">
                {booking.fittingStatus === 'confirmed'
                  ? 'Confirmed with the customer.'
                  : booking.fittingStatus === 'cancelled'
                    ? 'Cancelled.'
                    : 'Requested — not confirmed yet. This does not hold the rental dates.'}
              </Text>
            </View>
            {booking.fittingStatus === 'requested' ? (
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    label="Confirm fitting"
                    variant="secondary"
                    loading={fitting.isPending}
                    onPress={() =>
                      fitting.mutate({
                        reference: booking.ref,
                        status: 'confirmed',
                      })
                    }
                  />
                </View>
                <View className="flex-1">
                  <Button
                    label="Cancel fitting"
                    variant="outline"
                    onPress={() =>
                      fitting.mutate({
                        reference: booking.ref,
                        status: 'cancelled',
                      })
                    }
                  />
                </View>
              </View>
            ) : null}
          </View>
        ) : null}

        {rejecting ? (
          <View className="gap-3 rounded-2xl border border-hairline bg-surface p-4">
            <Text className="font-sans-medium text-sm text-ink">
              Why are you rejecting this?
            </Text>
            <Text className="font-sans text-xs text-muted">
              The customer sees this, so say what they could do differently.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="e.g. This gown is already promised for those dates."
              placeholderTextColor={PLACEHOLDER}
              multiline
              className="min-h-[88px] rounded-2xl border border-hairline bg-canvas-subtle p-3 font-sans text-base text-ink"
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  label="Send rejection"
                  variant="primary"
                  disabled={reason.trim().length === 0}
                  loading={update.isPending}
                  onPress={submitRejection}
                />
              </View>
              <View className="flex-1">
                <Button
                  label="Never mind"
                  variant="outline"
                  onPress={() => {
                    setRejecting(false);
                    setReason('');
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {actions.length > 0 && !rejecting ? (
        <View
          className="gap-3 border-t border-hairline px-5 pt-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {actions.map((a) => (
            <Button
              key={a}
              label={ACTION_LABEL[a]}
              variant={
                a === 'approve' || a === 'mark_picked_up'
                  ? 'primary'
                  : 'outline'
              }
              loading={update.isPending && a !== 'reject'}
              onPress={() => run(a)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
