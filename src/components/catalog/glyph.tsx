import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

type MCIName = ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Thin wrapper around MaterialCommunityIcons that centralizes the cast from the
 * plain `string` glyph names stored in catalog data to the icon set's name union.
 */
export function Glyph({
  name,
  size,
  color,
}: {
  name: string;
  size: number;
  color: string;
}) {
  return (
    <MaterialCommunityIcons name={name as MCIName} size={size} color={color} />
  );
}
