import { forwardRef, useState } from 'react';
import { Text, TextInput, View, type TextInputProps } from 'react-native';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

/**
 * Labeled text input with an inline error slot. Controlled — designed to sit
 * inside a React Hook Form `Controller` (pass `value` / `onChangeText` / `onBlur`).
 */
export const TextField = forwardRef<TextInput, Props>(function TextField(
  { label, error, hint, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);
  // Modern filled input: subtle tinted fill, no border at rest, violet ring on
  // focus, red ring on error.
  const border = error
    ? 'border-red-500'
    : focused
      ? 'border-grape dark:border-grape-soft'
      : 'border-transparent';

  return (
    <View className="w-full gap-2">
      <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
        {label}
      </Text>
      <TextInput
        ref={ref}
        placeholderTextColor="#A1A1AA"
        className={`rounded-2xl border font-sans ${border} bg-black/[0.04] px-4 py-4 text-base text-ink dark:bg-white/[0.06] dark:text-cloud`}
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
        <Text className="font-sans text-xs text-red-500">{error}</Text>
      ) : hint ? (
        <Text className="font-sans text-xs text-muted">{hint}</Text>
      ) : null}
    </View>
  );
});
