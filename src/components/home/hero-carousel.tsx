import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { HomeSlide } from '@/features/home/api';

/**
 * The shop's editorial hero.
 *
 * Paging is a plain horizontal ScrollView rather than a carousel library: three
 * slides need no virtualisation, and the page indicator is derived from scroll
 * offset so there is no second source of truth for "which slide".
 */
export function HeroCarousel({ slides }: { slides: HomeSlide[] }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  // The card spans the screen minus the 20pt gutters on both sides.
  const cardWidth = width - 40;

  if (slides.length === 0) return null;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / cardWidth);
    if (next !== index) setIndex(next);
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={cardWidth}
      >
        {slides.map((slide) => (
          <View
            key={slide.id}
            style={{ width: cardWidth }}
            className="overflow-hidden rounded-3xl bg-canvas-subtle"
          >
            <View className="absolute inset-0">
              {slide.imageUrl ? (
                <Image
                  source={{ uri: slide.imageUrl }}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  transition={200}
                  accessibilityLabel={slide.headline}
                />
              ) : null}
            </View>

            {/*
              A warm scrim so the serif stays legible over ANY photograph — the
              shop uploads these, so the text cannot depend on a convenient
              composition. Deliberately uniform: a stepped overlay leaves a hard
              vertical seam, and a real left-to-right fade would mean adding
              expo-linear-gradient for one decorative effect.
            */}
            <View className="absolute inset-0 bg-canvas/70" />

            <View className="min-h-[236px] justify-between gap-4 p-5">
              <View className="max-w-[62%] gap-2">
                <Text className="font-display-bold text-[34px] leading-[38px] text-ink">
                  {slide.headline}
                </Text>
                {slide.subhead ? (
                  <Text className="font-sans text-[11px] uppercase leading-4 tracking-[1.5px] text-muted">
                    {slide.subhead}
                  </Text>
                ) : null}
              </View>

              {slide.ctaLabel ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={slide.ctaLabel}
                  onPress={() =>
                    slide.ctaRoute
                      ? router.push(slide.ctaRoute as never)
                      : undefined
                  }
                  className="flex-row items-center gap-2 self-start rounded-2xl bg-bronze px-5 py-3.5 active:opacity-90"
                >
                  <Text className="font-sans-semibold text-base text-white">
                    {slide.ctaLabel}
                  </Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </Pressable>
              ) : null}
            </View>

            {slides.length > 1 ? (
              <View className="absolute bottom-4 right-4 rounded-full bg-ink/60 px-2.5 py-1">
                <Text className="font-sans-medium text-[11px] text-white">
                  {index + 1}/{slides.length}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
