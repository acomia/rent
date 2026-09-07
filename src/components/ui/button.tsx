import { BRONZE, BRONZE_DEEP } from '@/components/catalog/catalog-style';
import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

/**
 * Four variants, per DESIGN.md: bronze proposes (primary), charcoal commits
 * (the highest-commitment inline action, e.g. Check dates). Secondary is a soft
 * bronze fill, outline is a hairline.
 */
type Variant = 'primary' | 'secondary' | 'outline' | 'commit';

const base =
  'w-full flex-row items-center justify-center rounded-2xl px-5 py-4 active:opacity-90';

const variants: Record<Variant, string> = {
  primary: 'bg-bronze',
  secondary: 'bg-bronze-soft',
  outline: 'border border-hairline bg-transparent',
  commit: 'bg-charcoal',
};

const labelVariants: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-bronze-deep',
  outline: 'text-ink',
  commit: 'text-white',
};

const spinnerColor: Record<Variant, string> = {
  primary: '#FFFFFF',
  secondary: BRONZE_DEEP,
  outline: BRONZE,
  commit: '#FFFFFF',
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
        <ActivityIndicator color={spinnerColor[variant]} />
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
