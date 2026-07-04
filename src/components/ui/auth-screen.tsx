import { type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Brandmark } from '@/components/brandmark';

/**
 * Shared shell for every screen in the (auth) flow: keyboard-aware, centered,
 * blush canvas, brandmark at the top, then a title/subtitle and the form. Keeps
 * the whole flow reading as one boutique.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
  showBrandmark = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  showBrandmark?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      className="flex-1 bg-canvas dark:bg-night-950"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center gap-8 px-6"
        contentContainerStyle={{
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {showBrandmark ? <Brandmark /> : null}
        <View className="gap-2">
          <Text className="font-sans-bold text-3xl text-ink dark:text-cloud">
            {title}
          </Text>
          {subtitle ? (
            <Text className="font-sans text-base leading-6 text-muted">
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View className="gap-4">{children}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
