import { Feather } from '@expo/vector-icons';
import { TextInput, View, type TextInputProps } from 'react-native';

/**
 * Rounded search field with a leading magnifier, matching the catalog's pill
 * language. Controlled — pass `value` / `onChangeText`.
 */
export function SearchBar(props: TextInputProps) {
  return (
    <View className="h-14 flex-row items-center gap-3 rounded-full bg-canvas-subtle px-5 dark:bg-night-800">
      <Feather name="search" size={20} color="#8A8698" />
      <TextInput
        placeholder="Search the items…"
        placeholderTextColor="#A1A1AA"
        className="flex-1 font-sans text-base text-ink dark:text-cloud"
        {...props}
      />
    </View>
  );
}
