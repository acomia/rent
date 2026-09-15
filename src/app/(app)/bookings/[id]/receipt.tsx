import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowHeader } from '@/components/booking/flow-header';
import { DetailRow } from '@/components/booking/money-block';
import { usePayments } from '@/features/booking/hooks';
import { formatPeso } from '@/features/catalog/types';

const STATUS_LABEL: Record<string, string> = {
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  forfeited: 'Forfeited',
};

const TYPE_LABEL: Record<string, string> = {
  deposit: 'Deposit',
  balance: 'Balance',
  penalty: 'Penalty',
};

/** In-app receipt — text only. PDF/email are Phase 9, not this phase. */
export default function Receipt() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: payments, isLoading } = usePayments(id);

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Receipt" />
      <View
        className="flex-1 px-5 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        {isLoading ? null : !payments || payments.length === 0 ? (
          <Text className="text-center font-sans text-base text-muted">
            No payments recorded for this booking yet.
          </Text>
        ) : (
          <View className="divide-y divide-hairline">
            {payments.map((p, i) => (
              <DetailRow
                key={i}
                label={`${TYPE_LABEL[p.type]} — ${STATUS_LABEL[p.status]}`}
                value={formatPeso(p.amount)}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
}
