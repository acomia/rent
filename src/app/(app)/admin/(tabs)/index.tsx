import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ShopHeader } from '@/components/admin/shop-header';
import { BRONZE } from '@/components/catalog/catalog-style';
import { useAdminBookings } from '@/features/admin/bookings-hooks';
import { today as todayFn } from '@/features/booking/availability';
import { daysBetween, formatDate, fromKey } from '@/features/booking/dates';

type Tone = 'overdue' | 'pending' | 'outnow' | 'cleaning' | 'neutral';

const FILL: Record<Tone, string> = {
  overdue: 'bg-overdue-soft border-overdue-soft',
  pending: 'bg-pending-soft border-pending-soft',
  outnow: 'bg-outnow-soft border-outnow-soft',
  cleaning: 'bg-cleaning-soft border-cleaning-soft',
  neutral: 'bg-surface border-hairline',
};

const TEXT: Record<Tone, string> = {
  overdue: 'text-overdue',
  pending: 'text-pending',
  outnow: 'text-outnow',
  cleaning: 'text-cleaning',
  neutral: 'text-ink',
};

/**
 * A worklist.
 *
 * Each card carries its OWN tint rather than a shared one, so the shop learns
 * the board by colour and can find "overdue" without reading. This is the one
 * place the app's status palette is used for wayfinding instead of for status —
 * safe here because a card is always a big number plus its label, never colour
 * alone. The two informational counts ("today's…") stay neutral, so tint on this
 * screen still means "a decision lives here".
 *
 * Zero is always drawn colourless: on a day when nothing is wrong the whole
 * screen goes quiet.
 */
function Stat({
  count,
  label,
  tone,
  weight = 1,
  height = 104,
  onPress,
}: {
  count: number;
  label: string;
  tone: Tone;
  /** Flex weight. The board's grid is asymmetric — Overdue is a narrower tile. */
  weight?: number;
  height?: number;
  onPress: () => void;
}) {
  const t: Tone = count === 0 ? 'neutral' : tone;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${count} ${label}`}
      onPress={onPress}
      style={{
        flexGrow: weight,
        flexShrink: 1,
        flexBasis: 0,
        minHeight: height,
      }}
      className={`justify-between rounded-2xl border p-4 active:opacity-90 ${FILL[t]}`}
    >
      <Text
        className={`font-display-bold text-[32px] leading-[36px] ${TEXT[t]}`}
      >
        {count}
      </Text>
      <Text
        className={`font-sans text-xs leading-4 ${count === 0 ? 'text-muted' : TEXT[t]}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'Good morning!';
  if (h < 18) return 'Good afternoon!';
  return 'Good evening!';
}

export default function AdminDashboard() {
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const today = todayFn();
  const { data = [], isRefetching, refetch } = useAdminBookings();

  const overdue = data.filter(
    (b) =>
      (b.status === 'picked_up' || b.status === 'rented') &&
      daysBetween(today, fromKey(b.ret)) < 0,
  ).length;

  const pickupsToday = data.filter(
    (b) =>
      b.status === 'approved' && daysBetween(today, fromKey(b.pickup)) === 0,
  ).length;

  const returnsToday = data.filter(
    (b) =>
      (b.status === 'picked_up' || b.status === 'rented') &&
      daysBetween(today, fromKey(b.ret)) === 0,
  ).length;

  const pendingApprovals = data.filter(
    (b) => b.status === 'pending' || b.status === 'hold',
  ).length;

  // Until `payments` lands in Phase 5 there is nothing to reconcile against, so
  // this counts bookings that have been agreed but whose balance is still owed
  // at the counter. It will become a join on `payments`, not a longer guess.
  const unpaidBalances = data.filter(
    (b) =>
      b.status === 'approved' ||
      b.status === 'picked_up' ||
      b.status === 'rented',
  ).length;

  const toBookings = () => router.push('/admin/bookings');
  const toReturns = () => router.push('/admin/returns');

  return (
    <View className="flex-1 bg-canvas">
      <ShopHeader />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pt-2"
        contentContainerStyle={{ paddingBottom: tabBarHeight + 16 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRONZE}
          />
        }
      >
        <View className="gap-1">
          <Text className="font-sans text-sm text-muted">
            Today, {formatDate(today)}
          </Text>
          <Text className="font-display-bold text-3xl text-ink">
            {greeting(new Date())}
          </Text>
        </View>

        {/*
          The board's grid is deliberately uneven: a narrow Overdue tile beside
          two equal "today" tiles, then a taller two-up row. Size carries
          meaning here — the bottom row holds the counts a shop acts on, so it
          gets the room, and the top row is the glance.
        */}
        <View className="gap-3">
          <View className="flex-row gap-3">
            <Stat
              count={overdue}
              label="Overdue"
              tone="overdue"
              weight={0.72}
              onPress={toReturns}
            />
            <Stat
              count={pickupsToday}
              label={"Today's\npickups"}
              tone="neutral"
              onPress={toBookings}
            />
            <Stat
              count={returnsToday}
              label={"Today's\nreturns"}
              tone="neutral"
              onPress={toReturns}
            />
          </View>
          <View className="flex-row gap-3">
            <Stat
              count={pendingApprovals}
              label={'Pending\napprovals'}
              tone="cleaning"
              height={124}
              onPress={toBookings}
            />
            <Stat
              count={unpaidBalances}
              label={'Unpaid\nbalances'}
              tone="pending"
              height={124}
              onPress={toBookings}
            />
          </View>
        </View>

        {overdue === 0 && pendingApprovals === 0 ? (
          <Text className="font-sans text-sm leading-5 text-muted">
            Nothing needs you right now.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
