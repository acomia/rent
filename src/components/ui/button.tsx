import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost';

const base =
  'w-full flex-row items-center justify-center rounded-full px-5 py-4 active:opacity-90';

const variants: Record<Variant, string> = {
  primary: 'bg-grape dark:bg-grape-soft',
  secondary: 'bg-bubblegum',
  outline: 'border border-grape/40 bg-transparent dark:border-cloud/30',
  ghost: 'bg-transparent',
};

const labelVariants: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-grape dark:text-cloud',
  ghost: 'text-grape dark:text-cloud',
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
        <ActivityIndicator
          color={
            variant === 'primary' || variant === 'secondary'
              ? '#fff'
              : '#8165CA'
          }
        />
      ) : (
        <Text
          className={`font-sans-semibold text-base ${labelVariants[variant]}`}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}
