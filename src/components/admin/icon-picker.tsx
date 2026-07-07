import { Pressable, Text, View } from 'react-native';

import { Field } from '@/components/admin/field';
import { Glyph } from '@/components/catalog/glyph';
import { ICON_OPTIONS } from '@/features/admin/schemas';

/** Glyph grid shared by the item and category forms to pick a catalog icon. */
export function IconPicker({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (glyph: string) => void;
  error?: string;
}) {
  return (
    <Field label={label}>
      <View className="flex-row flex-wrap gap-2">
        {ICON_OPTIONS.map((glyph) => {
          const selected = value === glyph;
          return (
            <Pressable
              key={glyph}
              accessibilityRole="button"
              accessibilityLabel={glyph}
              accessibilityState={{ selected }}
              onPress={() => onChange(glyph)}
              className={`h-12 w-12 items-center justify-center rounded-2xl ${
                selected
                  ? 'bg-grape dark:bg-grape-soft'
                  : 'bg-canvas-subtle dark:bg-night-800'
              }`}
            >
              <Glyph
                name={glyph}
                size={22}
                color={selected ? '#fff' : '#6E6A7D'}
              />
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text className="font-sans text-xs text-red-500">{error}</Text>
      ) : null}
    </Field>
  );
}
