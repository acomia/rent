import { Feather } from '@expo/vector-icons';
import { TextInput, View, type TextInputProps } from 'react-native';

import { MUTED, PLACEHOLDER } from './catalog-style';

/**
 * Search field on the recessed fill, with a leading magnifier. Controlled —
 * pass `value` / `onChangeText`.
 */
export function SearchBar(props: TextInputProps) {
  return (
    <View className="h-14 flex-row items-center gap-3 rounded-2xl border border-hairline bg-canvas-subtle px-4">
      <Feather name="search" size={20} color={MUTED} />
      <TextInput
        placeholder="Search gowns, costumes…"
        placeholderTextColor={PLACEHOLDER}
        className="flex-1 font-sans text-base text-ink"
        {...props}
      />
    </View>
  );
}
