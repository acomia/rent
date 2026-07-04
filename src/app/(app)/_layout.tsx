import { Stack } from 'expo-router';

import { CartProvider } from '@/features/catalog/cart-context';

export default function AppLayout() {
  return (
    <CartProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="search" />
        <Stack.Screen name="category/[slug]" />
        <Stack.Screen name="product/[id]" />
      </Stack>
    </CartProvider>
  );
}
