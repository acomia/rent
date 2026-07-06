import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';

import { AuthScreen } from '@/components/ui/auth-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/features/auth/auth-context';
import { loginSchema, type LoginForm } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

export default function Login() {
  const { configured, enableDevBypass } = useAuth();
  const { replace } = useRouter();
  // DEV-ONLY: with no backend configured, "Sign in" skips auth for a local demo.
  // Disappears in production builds and the moment real Supabase keys are set.
  const devBypass = __DEV__ && !configured;

  function handleDevBypass() {
    enableDevBypass();
    replace('/(app)/(tabs)');
  }

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema as any),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginForm) {
    if (!supabase) {
      setError('root', {
        message: 'App is not configured — add Supabase keys to .env.',
      });
      return;
    }
    const { error } = await supabase.auth.signInWithPassword(values);
    if (error) {
      setError('root', { message: error.message });
    }
    // On success, onAuthStateChange updates the session and the root gate routes us in.
  }

  return (
    <AuthScreen title="Welcome back" subtitle="Sign in to browse and reserve.">
      {!configured ? (
        <Text className="rounded-xl bg-amber-500/15 px-4 py-3 font-sans text-sm text-amber-700 dark:text-amber-400">
          Supabase keys are missing from .env — sign-in will not work yet.
        </Text>
      ) : null}

      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Email"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.email?.message}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
          />
        )}
      />

      <Link
        href="/(auth)/forgot-password"
        className="self-end font-sans-medium text-sm text-grape dark:text-grape-soft"
      >
        Forgot password?
      </Link>

      {errors.root ? (
        <Text className="font-sans text-sm text-red-500">
          {errors.root.message}
        </Text>
      ) : null}

      <Button
        label="Sign in"
        loading={isSubmitting}
        onPress={devBypass ? handleDevBypass : handleSubmit(onSubmit)}
      />
      {devBypass ? (
        <Text className="text-center font-sans text-xs text-muted">
          Dev mode: signs in without a backend (no credentials needed).
        </Text>
      ) : null}

      <View className="flex-row justify-center gap-1 pt-2">
        <Text className="font-sans text-muted">New here?</Text>
        <Link
          href="/(auth)/signup"
          className="font-sans-semibold text-grape dark:text-grape-soft"
        >
          Create an account
        </Link>
      </View>
    </AuthScreen>
  );
}
