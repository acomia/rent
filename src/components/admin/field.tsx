import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

/** Section wrapper: a labelled block with consistent spacing, shared by the admin forms. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-2">
      <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
        {label}
      </Text>
      {children}
    </View>
  );
}
