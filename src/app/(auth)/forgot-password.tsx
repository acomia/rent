import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text } from 'react-native';

import { AuthScreen } from '@/components/ui/auth-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import {
  forgotRequestSchema,
  forgotResetSchema,
  type ForgotRequestForm,
  type ForgotResetForm,
} from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const { replace } = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  return email ? (
    <ResetStage
      email={email}
      onDone={() => replace('/(auth)/login')}
      onResend={() => setEmail(null)}
    />
  ) : (
    <RequestStage onSent={setEmail} />
  );
}

function RequestStage({ onSent }: { onSent: (email: string) => void }) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotRequestForm>({
    resolver: zodResolver(forgotRequestSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit({ email }: ForgotRequestForm) {
    if (!supabase) {
      setError('root', {
        message: 'App is not configured — add Supabase keys to .env.',
      });
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      setError('root', { message: error.message });
      return;
    }
    onSent(email);
  }

  return (
    <AuthScreen
      title="Reset password"
      subtitle="Enter your email and we'll send a 6-digit reset code."
    >
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
            autoFocus
          />
        )}
      />
      {errors.root ? (
        <Text className="font-sans text-sm text-red-500">
          {errors.root.message}
        </Text>
      ) : null}
      <Button
        label="Send reset code"
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
    </AuthScreen>
  );
}

function ResetStage({
  email,
  onDone,
  onResend,
}: {
  email: string;
  onDone: () => void;
  onResend: () => void;
}) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotResetForm>({
    resolver: zodResolver(forgotResetSchema),
    defaultValues: { code: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ForgotResetForm) {
    if (!supabase) return;
    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email,
      token: values.code,
      type: 'recovery',
    });
    if (verifyErr) {
      setError('code', { message: verifyErr.message });
      return;
    }
    const { error: updateErr } = await supabase.auth.updateUser({
      password: values.password,
    });
    if (updateErr) {
      setError('root', { message: updateErr.message });
      return;
    }
    // Sign out so the recovery session isn't reused; user logs in fresh.
    await supabase.auth.signOut();
    onDone();
  }

  return (
    <AuthScreen
      title="Choose a new password"
      subtitle={`Enter the code sent to ${email}.`}
    >
      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Reset code"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.code?.message}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            autoFocus
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="New password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.password?.message}
            hint="At least 8 characters."
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Confirm new password"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.confirmPassword?.message}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
        )}
      />
      {errors.root ? (
        <Text className="font-sans text-sm text-red-500">
          {errors.root.message}
        </Text>
      ) : null}
      <Button
        label="Update password"
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
      <Text
        onPress={onResend}
        className="self-center py-2 font-sans-medium text-sm text-grape dark:text-grape-soft"
      >
        Use a different email
      </Text>
    </AuthScreen>
  );
}
