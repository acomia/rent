import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { env, supabaseConfigured } from '@/lib/env';
import { Sentry } from '@/lib/sentry';
import { supabase } from '@/lib/supabase';

type Check = 'idle' | 'pending' | 'ok' | 'fail';

export default function Home() {
  const [supaCheck, setSupaCheck] = useState<Check>('idle');
  const [supaMsg, setSupaMsg] = useState('');

  async function pingSupabase() {
    if (!supabaseConfigured) {
      setSupaCheck('fail');
      setSupaMsg('Not configured — add keys to .env');
      return;
    }
    setSupaCheck('pending');
    try {
      // getSession round-trips through the auth client; a clean response means
      // the client is wired correctly even before any tables exist.
      const { error } = await supabase.auth.getSession();
      if (error) throw error;
      setSupaCheck('ok');
      setSupaMsg('Connected');
    } catch (e) {
      setSupaCheck('fail');
      setSupaMsg(e instanceof Error ? e.message : 'Unknown error');
    }
  }

  function throwTestError() {
    Sentry.captureException(new Error('Rent: Phase 0 test error'));
  }

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-neutral-950">
      <ScrollView contentContainerClassName="flex-1 items-center justify-center gap-8 p-6">
        <View className="items-center gap-2">
          <Text className="text-4xl font-bold text-neutral-900 dark:text-white">
            Rent
          </Text>
          <Text className="text-center text-base text-neutral-500 dark:text-neutral-400">
            Gown & costume rentals — Phase 0 foundations
          </Text>
        </View>

        <View className="w-full gap-3">
          <Pressable
            onPress={pingSupabase}
            className="rounded-xl bg-blue-600 px-5 py-4 active:opacity-80"
          >
            <Text className="text-center font-semibold text-white">
              Test Supabase connection
            </Text>
          </Pressable>
          <StatusLine state={supaCheck} label="Supabase" detail={supaMsg} />

          <Pressable
            onPress={throwTestError}
            className="mt-2 rounded-xl border border-neutral-300 px-5 py-4 active:opacity-80 dark:border-neutral-700"
          >
            <Text className="text-center font-semibold text-neutral-900 dark:text-white">
              Send test error to Sentry
            </Text>
          </Pressable>
          <Text className="text-center text-xs text-neutral-400">
            {env.sentryDsn
              ? 'Sentry DSN set'
              : 'Sentry runs in no-op mode (no DSN)'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusLine({
  state,
  label,
  detail,
}: {
  state: Check;
  label: string;
  detail: string;
}) {
  if (state === 'idle') return null;
  const color =
    state === 'ok'
      ? 'text-green-600'
      : state === 'fail'
        ? 'text-red-600'
        : 'text-neutral-500';
  const mark = state === 'ok' ? '✓' : state === 'fail' ? '✕' : '…';
  return (
    <Text className={`text-center text-sm ${color}`}>
      {mark} {label}: {state === 'pending' ? 'checking…' : detail}
    </Text>
  );
}
