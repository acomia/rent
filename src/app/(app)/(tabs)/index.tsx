import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BRONZE, INK, MUTED } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { Button } from '@/components/ui/button';
import { StatusBadge, CUSTOMER_STATUS } from '@/components/ui/status-badge';
import { HeroCarousel } from '@/components/home/hero-carousel';
import { QuickActionsSheet } from '@/components/home/quick-actions-sheet';
import { useAuth } from '@/features/auth/auth-context';
import { today as todayFn } from '@/features/booking/availability';
import {
  daysBetween,
  formatDate,
  formatRange,
  fromKey,
} from '@/features/booking/dates';
import { useBookings } from '@/features/booking/hooks';
import { useCategories, useItems } from '@/features/catalog/hooks';
import { formatShopTime } from '@/features/home/api';
import {
  useAnnouncements,
  useHomeSlides,
  useShopSettings,
} from '@/features/home/hooks';
import type { Category } from '@/features/catalog/types';

type FeatherName = keyof typeof Feather.glyphMap;

function greeting(d: Date) {
  const h = d.getHours();
  if (h < 12) return 'Good morning,';
  if (h < 18) return 'Good afternoon,';
  return 'Good evening,';
}

/** The four shortcuts under the hero. */
function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="flex-1 items-center gap-2 active:opacity-70"
    >
      <View className="h-16 w-full items-center justify-center rounded-2xl border-hairline bg-surface">
        <Feather name={icon} size={21} color={INK} />
      </View>
      <Text className="font-sans text-xs text-ink">{label}</Text>
    </Pressable>
  );
}

/**
 * Home.
 *
 * Deliberately NOT a second catalog — Browse owns discovery. Home answers
 * "what do I need to do, and what's worth a look": the next booking, four
 * shortcuts, and curated entry points. All of it is live: slides, the shop's
 * address and pickup hours, and announcements come from Supabase so the shop
 * changes them without a release.
 */
export default function Home() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { customer } = useAuth();
  const today = todayFn();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);

  const slides = useHomeSlides();
  const shop = useShopSettings();
  const announcements = useAnnouncements();
  const categories = useCategories();
  const items = useItems();
  const bookings = useBookings();

  const firstName = (customer?.full_name ?? '').split(' ')[0];

  // The one booking that needs attention: soonest pickup still ahead of us.
  const upcoming = useMemo(() => {
    const active = (bookings.data ?? []).filter(
      (b) =>
        (b.status === 'confirmed' || b.status === 'pending') &&
        daysBetween(today, fromKey(b.pickup)) >= 0,
    );
    return active.sort((a, b) => a.pickup.localeCompare(b.pickup))[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings.data]);

  const banner = (announcements.data ?? []).find(
    (a) => !dismissed.includes(a.id),
  );

  function coverFor(c: Category): string | null {
    return (
      (items.data ?? []).find((i) => i.category === c.slug && i.photos[0])
        ?.photos[0] ?? null
    );
  }

  const pickupFrom = formatShopTime(shop.data?.pickupFrom ?? null);

  /** Curated entry points — each is a real query, not a static tile. */
  const curated = [
    { label: 'New arrivals', params: {} as Record<string, string> },
    { label: 'Evening gowns', params: { occasion: 'formal' } },
    { label: 'Costumes', params: { slug: 'costumes' } },
  ];

  return (
    <View className="flex-1 bg-canvas">
      <ScrollView
        contentContainerClassName="gap-7 px-5"
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: tabBarHeight + 16,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={bookings.isRefetching}
            onRefresh={bookings.refetch}
            tintColor={BRONZE}
          />
        }
      >
        <View className="flex-row items-start justify-between">
          <View className="gap-0.5">
            <Text className="font-sans text-base text-muted">
              {greeting(new Date())}
            </Text>
            <Text className="font-display-bold text-4xl text-ink">
              {firstName || 'Welcome'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => router.push('/(app)/profile/settings')}
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
          >
            <Feather name="bell" size={21} color={INK} />
            {banner ? (
              <View className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-bronze" />
            ) : null}
          </Pressable>
        </View>

        <HeroCarousel slides={slides.data ?? []} />

        <View className="flex-row gap-3">
          <QuickAction
            icon="search"
            label="Find a look"
            onPress={() => setSheetOpen(true)}
          />
          <QuickAction
            icon="calendar"
            label="For an event"
            onPress={() =>
              router.push({
                pathname: '/(app)/search',
                params: { occasion: 'wedding' },
              })
            }
          />
          <QuickAction
            icon="clock"
            label="My bookings"
            onPress={() => router.push('/(app)/(tabs)/bookings')}
          />
          <QuickAction
            icon="map-pin"
            label="Visit store"
            onPress={() =>
              shop.data?.mapUrl
                ? Linking.openURL(shop.data.mapUrl)
                : router.push('/(app)/profile/settings')
            }
          />
        </View>

        {banner ? (
          <View className="flex-row items-start gap-3 rounded-2xl border-hairline bg-surface p-4">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-bronze-soft">
              <Feather name="map-pin" size={16} color={BRONZE} />
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-sans-semibold text-base text-ink">
                {banner.title}
              </Text>
              {banner.body ? (
                <Text className="font-sans text-sm leading-5 text-muted">
                  {banner.body}
                </Text>
              ) : null}
              {banner.actionLabel && banner.actionUrl ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => Linking.openURL(banner.actionUrl!)}
                  hitSlop={6}
                  className="flex-row items-center gap-1.5 pt-1 active:opacity-70"
                >
                  <Text className="font-sans-medium text-sm text-bronze">
                    {banner.actionLabel}
                  </Text>
                  <Feather name="arrow-right" size={14} color={BRONZE} />
                </Pressable>
              ) : null}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
              onPress={() => setDismissed((d) => [...d, banner.id])}
              hitSlop={8}
              className="active:opacity-70"
            >
              <Feather name="x" size={17} color={MUTED} />
            </Pressable>
          </View>
        ) : null}

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display-semibold text-xl text-ink">
              Your upcoming booking
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/(tabs)/bookings')}
              hitSlop={8}
              className="active:opacity-70"
            >
              <Text className="font-sans-medium text-sm text-bronze">
                View all
              </Text>
            </Pressable>
          </View>

          {upcoming ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${upcoming.itemName} booking`}
              onPress={() =>
                router.push({
                  pathname: '/(app)/bookings/[id]',
                  params: { id: upcoming.ref },
                })
              }
              className="flex-row items-center gap-3 rounded-2xl border-hairline bg-surface p-3 active:opacity-90"
            >
              <View className="h-20 w-16 items-center justify-center overflow-hidden rounded-xl bg-canvas-subtle">
                {upcoming.itemPhoto ? (
                  <Image
                    source={{ uri: upcoming.itemPhoto }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={150}
                  />
                ) : (
                  <Glyph name="hanger" size={24} color={MUTED} />
                )}
              </View>
              <View className="flex-1 gap-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text
                    numberOfLines={1}
                    className="flex-1 font-display-semibold text-base text-ink"
                  >
                    {upcoming.itemName}
                  </Text>
                  <StatusBadge status={CUSTOMER_STATUS[upcoming.status]} />
                </View>
                <Text className="font-sans text-xs text-muted">
                  {formatRange(fromKey(upcoming.pickup), fromKey(upcoming.ret))}
                </Text>
                {shop.data?.pickupLabel ? (
                  <View className="flex-row items-center gap-1.5">
                    <Feather name="map-pin" size={11} color={MUTED} />
                    <Text className="font-sans text-xs text-muted">
                      Pick up at {shop.data.pickupLabel}
                    </Text>
                  </View>
                ) : null}
                <View className="flex-row items-center gap-1.5">
                  <Feather name="calendar" size={11} color={MUTED} />
                  <Text className="font-sans text-xs text-muted">
                    {formatDate(fromKey(upcoming.pickup))}
                    {pickupFrom ? `, from ${pickupFrom}` : ''}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={MUTED} />
            </Pressable>
          ) : (
            <View className="items-center gap-3 rounded-2xl border-hairline bg-surface px-6 py-8">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-canvas-subtle">
                <Feather name="calendar" size={20} color={MUTED} />
              </View>
              <View className="gap-1">
                <Text className="text-center font-display-semibold text-lg text-ink">
                  No upcoming bookings yet.
                </Text>
                <Text className="text-center font-sans text-sm text-muted">
                  Find the perfect look for your next moment.
                </Text>
              </View>
              <View className="w-44">
                <Button
                  label="Explore now"
                  onPress={() => router.push('/(app)/(tabs)/browse')}
                />
              </View>
            </View>
          )}
        </View>

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-display-semibold text-xl text-ink">
              Just for you
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/(app)/(tabs)/browse')}
              hitSlop={8}
              className="active:opacity-70"
            >
              <Text className="font-sans-medium text-sm text-bronze">
                See all
              </Text>
            </Pressable>
          </View>

          <View className="flex-row gap-3">
            {curated.map((c, i) => {
              const photo = (items.data ?? [])[i]?.photos[0] ?? null;
              return (
                <Pressable
                  key={c.label}
                  accessibilityRole="button"
                  accessibilityLabel={c.label}
                  onPress={() =>
                    c.params.slug
                      ? router.push({
                          pathname: '/(app)/category/[slug]',
                          params: { slug: c.params.slug },
                        })
                      : router.push({
                          pathname: '/(app)/search',
                          params: c.params,
                        })
                  }
                  className="flex-1 gap-2 active:opacity-90"
                >
                  <View className="aspect-[3/4] items-center justify-center overflow-hidden rounded-2xl bg-canvas-subtle">
                    {photo ? (
                      <Image
                        source={{ uri: photo }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                        transition={200}
                      />
                    ) : null}
                  </View>
                  <Text
                    numberOfLines={1}
                    className="font-sans-medium text-xs text-ink"
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <QuickActionsSheet
        visible={sheetOpen}
        categories={categories.data ?? []}
        coverFor={coverFor}
        onSelect={(c) => {
          setSheetOpen(false);
          router.push({
            pathname: '/(app)/category/[slug]',
            params: { slug: c.slug },
          });
        }}
        onClose={() => setSheetOpen(false)}
      />
    </View>
  );
}
