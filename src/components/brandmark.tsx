import { Text, View } from 'react-native';

/**
 * The Hiramda wordmark lockup — a bold lowercase geometric-sans wordmark with a
 * violet accent dot, over a quiet muted tagline. Modern, app-like; repeated
 * across every auth screen so the flow reads as one product.
 */
export function Brandmark({
  tagline = 'Gowns & costumes, reserved',
}: {
  tagline?: string;
}) {
  return (
    <View className="items-center gap-2">
      <View className="flex-row items-end gap-1">
        <Text className="font-sans-extrabold text-4xl tracking-tighter text-ink dark:text-cloud">
          hiramda
        </Text>
        <View className="mb-1.5 h-2.5 w-2.5 rounded-full bg-grape" />
      </View>
      <Text className="font-sans-medium text-sm text-muted">{tagline}</Text>
    </View>
  );
}
