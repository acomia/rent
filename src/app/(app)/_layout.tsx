import { Stack } from 'expo-router';

import { CartProvider } from '@/features/catalog/cart-context';

export default function AppLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="product/[id]" />
        <Stack.Screen name="admin" />
      </Stack>
    </CartProvider>
  );
}
