import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { BRONZE, MUTED } from '@/components/catalog/catalog-style';
import { CatalogError } from '@/components/catalog/states';
import type { AdminAnnouncement } from '@/features/admin/home-api';
import {
  useAdminAnnouncements,
  useDeleteAnnouncement,
} from '@/features/admin/home-hooks';
import { formatDate } from '@/features/booking/dates';

/**
 * Announcements — the banner under Home's shortcuts.
 *
 * The list's job is to make "is this actually showing right now?" obvious,
 * because RLS answers that question on the customer's side and nothing else in
 * the app reports it. A banner can be saved, switched on, and still invisible
 * because its window has not started or has already ended.
 */

type Live =
  | { state: 'live'; label: string }
  | { state: 'scheduled'; label: string }
  | { state: 'ended'; label: string }
  | { state: 'off'; label: string };

/**
 * Mirrors `announcements_select_live` in `0016_home_content.sql`. Kept in step
 * with it by hand — if that policy changes, this label lies.
 */
function liveState(a: AdminAnnouncement, now: Date): Live {
  if (!a.isActive) return { state: 'off', label: 'Off' };
  const starts = a.startsAt ? new Date(a.startsAt) : null;
  const ends = a.endsAt ? new Date(a.endsAt) : null;
  if (starts && starts > now) {
    return { state: 'scheduled', label: `From ${formatDate(starts)}` };
  }
  if (ends && ends <= now) {
    return { state: 'ended', label: `Ended ${formatDate(ends)}` };
  }
  return {
    state: 'live',
    label: ends ? `Live until ${formatDate(ends)}` : 'Live',
  };
}

/** Status tokens: a pale fill plus the matching ink, per DESIGN.md. */
const FILL: Record<Live['state'], string> = {
  live: 'bg-confirmed-soft',
  scheduled: 'bg-pending-soft',
  ended: 'bg-settled-soft',
  off: 'bg-settled-soft',
};
const INK: Record<Live['state'], string> = {
  live: 'text-confirmed',
  scheduled: 'text-pending',
  ended: 'text-settled',
  off: 'text-settled',
};

export default function AdminAnnouncements() {
  const { back, push } = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } =
    useAdminAnnouncements();
  const del = useDeleteAnnouncement();
  const announcements = data ?? [];
  const now = new Date();

  function onDelete(a: AdminAnnouncement) {
    Alert.alert('Delete announcement', `Delete “${a.title}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await del.mutateAsync(a.id);
          } catch (e) {
            Alert.alert(
              'Could not delete',
              e instanceof Error ? e.message : 'Please try again.',
            );
          }
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader
        title="Announcements"
        onBack={() => back()}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add announcement"
            onPress={() => push('/admin/announcements/new')}
            hitSlop={8}
            className="py-1 active:opacity-70"
          >
            <Feather name="plus" size={22} color={BRONZE} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerClassName="gap-3 px-5 pb-16"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={BRONZE}
          />
        }
      >
        {isError ? <CatalogError onRetry={() => refetch()} /> : null}

        {!isError && announcements.length === 0 ? (
          <View className="items-center gap-3 py-16">
            <View className="h-14 w-14 items-center justify-center rounded-full border-hairline bg-canvas-subtle">
              <Feather name="bell" size={22} color={MUTED} />
            </View>
            <Text className="px-8 text-center font-sans text-base text-muted">
              No announcements. Home shows no banner until one is live.
            </Text>
          </View>
        ) : null}

        {/*
          Home renders only the FIRST live announcement, so a second one is
          saved but silent. Better said here than discovered later.
        */}
        {announcements.filter((a) => liveState(a, now).state === 'live')
          .length > 1 ? (
          <View className="rounded-2xl bg-pending-soft p-4">
            <Text className="font-sans text-sm text-pending">
              More than one is live. Home shows only the first — schedule them
              instead so they take turns.
            </Text>
          </View>
        ) : null}

        {announcements.map((a) => {
          const live = liveState(a, now);
          return (
            <View
              key={a.id}
              className="flex-row items-start gap-3 rounded-2xl border-hairline bg-surface p-4"
            >
              <Pressable
                accessibilityRole="button"
                onPress={() => push(`/admin/announcements/${a.id}`)}
                className="flex-1 gap-1.5 active:opacity-70"
              >
                <Text
                  numberOfLines={1}
                  className="font-sans-semibold text-base text-ink"
                >
                  {a.title}
                </Text>
                {a.body ? (
                  <Text
                    numberOfLines={2}
                    className="font-sans text-sm text-muted"
                  >
                    {a.body}
                  </Text>
                ) : null}
                <View className="flex-row">
                  <View
                    className={`rounded-full px-2.5 py-1 ${FILL[live.state]}`}
                  >
                    <Text
                      className={`font-sans-medium text-[11px] ${INK[live.state]}`}
                    >
                      {live.label}
                    </Text>
                  </View>
                </View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Delete ${a.title}`}
                onPress={() => onDelete(a)}
                hitSlop={6}
                className="h-8 w-8 items-center justify-center active:opacity-70"
              >
                <Feather name="trash-2" size={16} color={MUTED} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
