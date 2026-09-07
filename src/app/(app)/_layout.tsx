import { Stack } from 'expo-router';

import { BookingProvider } from '@/features/booking/booking-context';
import { CartProvider } from '@/features/catalog/cart-context';

export default function AppLayout() {
  return (
    <CartProvider>
      <BookingProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="category/[slug]" />
          <Stack.Screen name="product/[id]" />
          <Stack.Screen name="search" />
          <Stack.Screen name="bag" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="reserve" />
          <Stack.Screen name="bookings/[id]" />
          <Stack.Screen name="admin" />
        </Stack>
      </BookingProvider>
    </CartProvider>
  );
}
