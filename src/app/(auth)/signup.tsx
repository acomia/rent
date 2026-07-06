import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from 'expo-router';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, Text, View } from 'react-native';

import { SegmentedToggle } from '@/components/catalog/segmented-toggle';
import { AuthScreen } from '@/components/ui/auth-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useAuth } from '@/features/auth/auth-context';
import {
  normalizePhone,
  signupSchema,
  TERMS_VERSION,
  type SignupForm,
} from '@/features/auth/schemas';
import { supabase } from '@/lib/supabase';

export default function Signup() {
  const { replace } = useRouter();
  const { configured } = useAuth();
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
      inviteCode: '',
      acceptedTerms: false,
    },
  });

  // Drives whether the invite-code field is shown. `useWatch` (not `watch()`)
  // so the React Compiler tracks it safely.
  const role = useWatch({ control, name: 'role' });

  async function onSubmit(values: SignupForm) {
    if (!supabase) {
      setError('root', {
        message: 'App is not configured — add Supabase keys to .env.',
      });
      return;
    }
    const phone = normalizePhone(values.phone);
    const inviteCode = values.inviteCode.trim();

    // Shop signups must present a valid invite code. Pre-check it so the user
    // gets a clean inline error; the DB trigger re-checks it server-side and is
    // the actual gate that provisions the admin row.
    if (values.role === 'admin') {
      const { data: valid, error: rpcError } = await supabase.rpc(
        'verify_admin_invite_code',
        { invite_code: inviteCode },
      );
      if (rpcError) {
        setError('root', { message: rpcError.message });
        return;
      }
      if (!valid) {
        setError('inviteCode', { message: 'Invalid or inactive invite code' });
        return;
      }
    }

    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.fullName,
          phone_number: phone,
          terms_version: TERMS_VERSION,
          accepted_terms: true,
          admin_invite_code: values.role === 'admin' ? inviteCode : undefined,
        },
      },
    });
    if (error) {
      setError('root', { message: error.message });
      return;
    }
    replace({ pathname: '/(auth)/verify-otp', params: { phone } });
  }

  return (
    <AuthScreen
      title="Create your account"
      subtitle="A few details, then we verify your number by text."
    >
      {!configured ? (
        <Text className="rounded-xl bg-amber-500/15 px-4 py-3 font-sans text-sm text-amber-700 dark:text-amber-400">
          Supabase keys are missing from .env — signup will not work yet.
        </Text>
      ) : null}

      <Controller
        control={control}
        name="role"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2">
            <Text className="font-sans-medium text-sm text-ink dark:text-cloud">
              I am signing up as
            </Text>
            <SegmentedToggle
              options={[
                { label: 'Customer', value: 'customer' },
                { label: 'Shop', value: 'admin' },
              ]}
              value={value}
              onChange={onChange}
            />
          </View>
        )}
      />

      {role === 'admin' ? (
        <Controller
          control={control}
          name="inviteCode"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextField
              label="Shop invite code"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.inviteCode?.message}
              hint="Provided by the shop. Required to manage the catalog."
              autoCapitalize="characters"
              autoCorrect={false}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="fullName"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Full name"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.fullName?.message}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
          />
        )}
      />

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
        name="phone"
        render={({ field: { onChange, onBlur, value } }) => (
          <TextField
            label="Mobile number"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.phone?.message}
            hint="We'll text a 6-digit code to verify it."
            keyboardType="phone-pad"
            autoComplete="tel"
            textContentType="telephoneNumber"
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
            label="Confirm password"
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

      <Controller
        control={control}
        name="acceptedTerms"
        render={({ field: { onChange, value } }) => (
          <View className="gap-1">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value }}
              onPress={() => onChange(!value)}
              className="flex-row items-start gap-3 py-1 active:opacity-70"
            >
              <View
                className={`mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2 ${
                  value
                    ? 'border-grape bg-grape dark:border-grape-soft dark:bg-grape-soft'
                    : 'border-black/25 dark:border-white/30'
                }`}
              >
                {value ? (
                  <Text className="font-sans-bold text-sm text-white">✓</Text>
                ) : null}
              </View>
              <Text className="flex-1 font-sans text-sm leading-5 text-muted">
                I agree to the{' '}
                <Link
                  href="/(auth)/terms"
                  className="font-sans-semibold text-grape dark:text-grape-soft"
                >
                  Terms
                </Link>{' '}
                and{' '}
                <Link
                  href="/(auth)/privacy"
                  className="font-sans-semibold text-grape dark:text-grape-soft"
                >
                  Privacy Policy
                </Link>
                .
              </Text>
            </Pressable>
            {errors.acceptedTerms ? (
              <Text className="font-sans text-xs text-red-500">
                {errors.acceptedTerms.message}
              </Text>
            ) : null}
          </View>
        )}
      />

      {errors.root ? (
        <Text className="font-sans text-sm text-red-500">
          {errors.root.message}
        </Text>
      ) : null}

      <Button
        label="Create account"
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />

      <View className="flex-row justify-center gap-1 pt-2">
        <Text className="font-sans text-muted">Already have an account?</Text>
        <Link
          href="/(auth)/login"
          className="font-sans-semibold text-grape dark:text-grape-soft"
        >
          Sign in
        </Link>
      </View>
    </AuthScreen>
  );
}
