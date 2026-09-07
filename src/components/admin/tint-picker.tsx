import { Feather } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Field } from '@/components/admin/field';
import { tintAccent } from '@/components/catalog/catalog-style';
import { TINTS } from '@/features/admin/schemas';
import type { Tint } from '@/features/catalog/types';

/** Colour-swatch grid shared by the item and category forms to pick a tint. */
export function TintPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Tint;
  onChange: (tint: Tint) => void;
}) {
  return (
    <Field label={label}>
      <View className="flex-row gap-3">
        {TINTS.map((tint) => {
          const selected = value === tint;
          return (
            <Pressable
              key={tint}
              accessibilityRole="button"
              accessibilityLabel={tint}
              accessibilityState={{ selected }}
              onPress={() => onChange(tint)}
              className={`h-11 w-11 items-center justify-center rounded-full ${
                selected ? 'border-2 border-bronze' : ''
              }`}
              style={{ backgroundColor: tintAccent[tint] }}
            >
              {selected ? (
                <Feather name="check" size={18} color="#fff" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Field>
  );
}
