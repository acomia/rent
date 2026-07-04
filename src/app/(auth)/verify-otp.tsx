import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text } from 'react-native';

import { AuthScreen } from '@/components/ui/auth-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/features/auth/auth-context';
import { otpSchema, type OtpForm } from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

const RESEND_COOLDOWN = 30;

export default function VerifyOtp() {
  const { replace } = useRouter();
  const { user, refreshCustomer, signOut } = useAuth();
  const params = useLocalSearchParams<{ phone?: string }>();
  // Prefer the phone we just signed up with; fall back to the account's metadata.
  const phone =
    params.phone ??
    (user?.user_metadata?.phone_number as string | undefined) ??
    '';

  const [sendError, setSendError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const requested = useRef(false);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { code: '' },
  });

  // Initial request starts the phone-change (updateUser); the resend button
  // re-sends the code for that pending change (resend), which is the correct API.
  async function requestCode(isResend: boolean) {
    if (!supabase || !phone) {
      setSendError('No phone number on file — go back and sign up again.');
      return;
    }
    setSendError(null);
    const { error } = isResend
      ? await supabase.auth.resend({ type: 'phone_change', phone })
      : await supabase.auth.updateUser({ phone });
    if (error) {
      setSendError(error.message);
      return;
    }
    setCooldown(RESEND_COOLDOWN);
  }

  // Request the first code once on mount.
  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    requestCode(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick down the resend cooldown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  async function onSubmit({ code }: OtpForm) {
    if (!supabase) return;
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: 'phone_change',
    });
    if (error) {
      setError('code', { message: error.message });
      return;
    }
    await refreshCustomer();
    replace('/(app)');
  }

  return (
    <AuthScreen
      title="Verify your number"
      subtitle={
        phone
          ? `Enter the 6-digit code we texted to ${phone}.`
          : 'Enter the 6-digit code we texted you.'
      }
    >
      {sendError ? (
        <Text className="rounded-xl bg-red-500/10 px-4 py-3 font-sans text-sm text-red-500">
          {sendError}
        </Text>
      ) : null}

      <Controller
        control={control}
        name="code"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Verification code"
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

      <Button
        label="Verify & continue"
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <Pressable
        disabled={cooldown > 0}
        onPress={() => requestCode(true)}
        className="self-center py-2 active:opacity-70"
      >
        <Text
          className={
            cooldown > 0
              ? 'text-muted'
              : 'font-sans-medium text-grape dark:text-grape-soft'
          }
        >
          {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
        </Text>
      </Pressable>

      {__DEV__ ? (
        <Button
          label="Skip verification (dev only)"
          variant="outline"
          onPress={() => replace('/(app)')}
        />
      ) : null}

      <Pressable
        onPress={async () => {
          await signOut();
          replace('/(auth)/signup');
        }}
        className="self-center py-2 active:opacity-70"
      >
        <Text className="font-sans text-sm text-muted">
          Use a different number
        </Text>
      </Pressable>
    </AuthScreen>
  );
}
