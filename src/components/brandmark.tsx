import { Text, View } from 'react-native';

/**
 * The Renta wordmark lockup — the display serif set large with tight tracking,
 * over a wide-tracked uppercase tagline. Repeated across every auth screen so
 * the flow reads as one product.
 */
export function Brandmark({
  tagline = 'Gowns and costumes for your moments',
}: {
  tagline?: string;
}) {
  return (
    <View className="items-center gap-3">
      <Text className="font-display-bold text-5xl tracking-tight text-ink">
        Renta
      </Text>
      <Text className="text-center font-sans text-[11px] uppercase tracking-[3px] text-muted">
        {tagline}
      </Text>
    </View>
  );
}
