import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { INK, tintClass } from '@/components/catalog/catalog-style';
import { Glyph } from '@/components/catalog/glyph';
import { Button } from '@/components/ui/button';
import { useCart } from '@/features/catalog/cart-context';
import { formatPeso, getProduct } from '@/features/catalog/mock-data';

export default function ProductDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { add, has } = useCart();
  const { id } = useLocalSearchParams<{ id: string }>();
  const product = getProduct(id ?? '');

  if (!product) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas px-6 dark:bg-night-950">
        <Text className="font-sans-semibold text-lg text-ink dark:text-cloud">
          Item not found
        </Text>
        <Pressable onPress={() => router.back()} className="mt-3">
          <Text className="font-sans-medium text-grape dark:text-grape-soft">
            Go back
          </Text>
        </Pressable>
      </View>
    );
  }

  const added = has(product.id);

  function reserve() {
    add(product!.id);
    Alert.alert(
      'Added to your bag',
      `${product!.name} — ${formatPeso(product!.pricePerDay)} / day. Checkout arrives in the next phase.`,
    );
  }

  return (
    <View className="flex-1 bg-canvas dark:bg-night-950">
      {/* Pastel hero — kept bright in both themes so the item pops. */}
      <View
        className={`items-center justify-center rounded-b-[40px] ${tintClass[product.tint]}`}
        style={{ paddingTop: insets.top + 8, height: 380 }}
      >
        <View
          className="absolute left-0 right-0 flex-row items-center justify-between px-6"
          style={{ top: insets.top + 8 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full bg-white/70 active:opacity-70"
          >
            <Feather name="chevron-left" size={22} color={INK} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save"
            className="h-11 w-11 items-center justify-center rounded-full bg-white/70 active:opacity-70"
          >
            <Feather name="heart" size={20} color={INK} />
          </Pressable>
        </View>

        <Glyph name={product.icon} size={140} color={INK} />

        <View className="absolute bottom-6 flex-row gap-2">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className={`h-2 rounded-full ${i === 0 ? 'w-6 bg-grape' : 'w-2 bg-ink/20'}`}
            />
          ))}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-1">
          <Text className="font-sans-medium text-sm text-muted">
            {product.designer}
          </Text>
          <Text className="font-sans-extrabold text-3xl text-ink dark:text-cloud">
            {product.name}
          </Text>
        </View>

        <View className="flex-row items-center gap-3">
          <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
            Colors
          </Text>
          <View className="flex-row gap-2">
            {product.swatches.map((hex) => (
              <View
                key={hex}
                className="h-6 w-6 rounded-full border border-black/10 dark:border-white/15"
                style={{ backgroundColor: hex }}
              />
            ))}
          </View>
        </View>

        <Text className="font-sans text-[15px] leading-6 text-muted">
          {product.description}
        </Text>
      </ScrollView>

      <View
        className="flex-row items-center gap-4 border-t border-black/5 px-6 pt-4 dark:border-white/10"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View>
          <Text className="font-sans-bold text-2xl text-ink dark:text-cloud">
            {formatPeso(product.pricePerDay)}
          </Text>
          <Text className="font-sans-medium text-xs text-muted">per day</Text>
        </View>
        <View className="flex-1">
          <Button
            label={added ? 'In your bag' : 'Reserve'}
            variant={added ? 'secondary' : 'primary'}
            disabled={added}
            onPress={added ? undefined : reserve}
          />
        </View>
      </View>
    </View>
  );
}
