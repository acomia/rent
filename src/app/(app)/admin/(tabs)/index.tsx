import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { ShopHeader } from '@/components/admin/shop-header';
import { BRONZE } from '@/components/catalog/catalog-style';
import {
  isOut,
  isOverdue,
  needsAction,
  owesBalance,
} from '@/features/admin/bookings-api';
import { useAdminBookings } from '@/features/admin/bookings-hooks';
import { today as todayFn } from '@/features/booking/availability';
import {
  daysBetween,
  formatDate,
  fromKey,
  toKey,
} from '@/features/booking/dates';

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
  // `todayFn()` returns a fresh Date each render; the day key is what the memo
  // below actually depends on.
  const todayKey = toKey(today);
  const { data = [], isRefetching, refetch } = useAdminBookings();

  // One pass instead of five, and only when the data changes. Each of the old
  // passes built a throwaway array and re-parsed every booking's return date,
  // on every render — including each refetch flip and each tab focus.
  const counts = useMemo(() => {
    const c = {
      overdue: 0,
      pickupsToday: 0,
      returnsToday: 0,
      pendingApprovals: 0,
      unpaidBalances: 0,
    };
    for (const b of data) {
      if (isOverdue(b, today)) c.overdue += 1;
      if (
        b.status === 'approved' &&
        daysBetween(today, fromKey(b.pickup)) === 0
      )
        c.pickupsToday += 1;
      if (isOut(b) && daysBetween(today, fromKey(b.ret)) === 0)
        c.returnsToday += 1;
      if (needsAction(b)) c.pendingApprovals += 1;
      if (owesBalance(b)) c.unpaidBalances += 1;
    }
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, todayKey]);

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
              count={counts.overdue}
              label="Overdue"
              tone="overdue"
              weight={0.72}
              onPress={toReturns}
            />
            <Stat
              count={counts.pickupsToday}
              label={"Today's\npickups"}
              tone="neutral"
              onPress={toBookings}
            />
            <Stat
              count={counts.returnsToday}
              label={"Today's\nreturns"}
              tone="neutral"
              onPress={toReturns}
            />
          </View>
          <View className="flex-row gap-3">
            <Stat
              count={counts.pendingApprovals}
              label={'Pending\napprovals'}
              tone="cleaning"
              height={124}
              onPress={toBookings}
            />
            <Stat
              count={counts.unpaidBalances}
              label={'Unpaid\nbalances'}
              tone="pending"
              height={124}
              onPress={toBookings}
            />
          </View>
        </View>

        {counts.overdue === 0 && counts.pendingApprovals === 0 ? (
          <Text className="font-sans text-sm leading-5 text-muted">
            Nothing needs you right now.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
