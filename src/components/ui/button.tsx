import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

type Variant = 'primary' | 'outline' | 'ghost';

const base =
  'w-full flex-row items-center justify-center rounded-2xl px-5 py-4 active:opacity-90';

const variants: Record<Variant, string> = {
  primary: 'bg-wine dark:bg-wine-soft',
  outline: 'border border-wine/40 bg-transparent dark:border-cream/30',
  ghost: 'bg-transparent',
};

const labelVariants: Record<Variant, string> = {
  primary: 'text-white',
  outline: 'text-wine dark:text-cream',
  ghost: 'text-wine dark:text-cream',
};

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  loading?: boolean;
};

export function Button({
  label,
  variant = 'primary',
  loading = false,
  disabled,
  ...rest
}: Props) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      className={`${base} ${variants[variant]} ${isDisabled ? 'opacity-50' : ''}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#6B2C46'} />
      ) : (
        <Text className={`text-base font-semibold ${labelVariants[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
