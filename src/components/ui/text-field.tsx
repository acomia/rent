import { forwardRef, useState } from 'react';

import { PLACEHOLDER } from '@/components/catalog/catalog-style';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Labeled text input with an inline error slot. Controlled — designed to sit
 * inside a React Hook Form `Controller` (pass `value` / `onChangeText` / `onBlur`).
 *
 * Recessed fill on the ivory ground, hairline at rest, ink ring on focus.
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const border = error
    ? 'border-overdue'
    : focused
      ? 'border-ink'
      : 'border-hairline';

  return (
    <View className="w-full gap-2">
      <Text className="font-sans-medium text-sm text-ink">{label}</Text>
      <TextInput
        ref={ref}
        placeholderTextColor={PLACEHOLDER}
        className={`rounded-2xl border font-sans ${border} bg-canvas-subtle px-4 py-4 text-base text-ink`}
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
      {error ? (
        <Text className="font-sans text-xs text-overdue">{error}</Text>
      ) : hint ? (
        <Text className="font-sans text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
