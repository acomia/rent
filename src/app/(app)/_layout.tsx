import { Stack } from 'expo-router';

import { BookingProvider } from '@/features/booking/booking-context';

export default function AppLayout() {
  return (
    <BookingProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="search" />
        <Stack.Screen name="categories" />
        <Stack.Screen name="size-guide" />
        {/*
          The real routes — there is no `profile.tsx`. `name="profile"` used to
          sit here and Expo Router warned on every launch that no such child
          exists (the Profile *tab* is `(tabs)/profile.tsx`, a different route).
        */}
        <Stack.Screen name="profile/edit" />
        <Stack.Screen name="profile/settings" />
        <Stack.Screen name="reserve" />
        <Stack.Screen name="bookings/[id]" />
        <Stack.Screen name="admin" />
      </Stack>
    </BookingProvider>
  );
}
