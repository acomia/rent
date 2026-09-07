import { Image } from 'expo-image';
import { Text, View } from 'react-native';

/**
 * Circular avatar with an initial fallback.
 *
 * Most customers will never upload a photo, so the fallback is the normal case,
 * not an error state — it gets the same warm treatment as the image.
 */
export function Avatar({
  uri,
  name,
  size = 72,
  badge,
}: {
  uri?: string | null;
  name?: string | null;
  size?: number;
  badge?: React.ReactNode;
}) {
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || '·';
  return (
    <View style={{ width: size, height: size }}>
      <View
        className="items-center justify-center overflow-hidden rounded-full bg-bronze-soft"
        style={{ width: size, height: size }}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={180}
            accessibilityLabel={name ? `${name}'s photo` : 'Profile photo'}
          />
        ) : (
          <Text
            className="font-display-bold text-bronze-deep"
            style={{ fontSize: size * 0.4 }}
          >
            {initial}
          </Text>
        )}
      </View>
      {badge ? (
        <View className="absolute -bottom-0.5 -right-0.5">{badge}</View>
      ) : null}
    </View>
  );
}
