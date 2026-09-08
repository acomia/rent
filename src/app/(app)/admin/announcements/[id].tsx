import { zodResolver } from '@hookform/resolvers/zod';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';

import { AdminHeader } from '@/components/admin/admin-header';
import { MonthCalendar } from '@/components/booking/month-calendar';
import { BRONZE } from '@/components/catalog/catalog-style';
import { TextField } from '@/components/ui/text-field';
import {
  useAdminAnnouncements,
  useSaveAnnouncement,
} from '@/features/admin/home-hooks';
import {
  announcementSchema,
  type AnnouncementFormInput,
  type AnnouncementFormValues,
} from '@/features/admin/schemas';
import { todayManila } from '@/features/booking/dates';

/**
 * Announcement editor.
 *
 * The window reuses the rental `MonthCalendar` as a plain range picker —
 * `unknownDay: 'available'` and no `states` map, exactly as the fitting picker
 * does. That avoids a native date picker, which `@expo/ui` only offers as a
 * platform-split component that DESIGN.md rules out.
 *
 * Dates are stored as timestamps but chosen as Manila calendar days: a shop
 * schedules a banner by day, never by minute. Start is midnight, end is the
 * end of the chosen day so that day is included — `ends_at > now()` in the RLS
 * policy is exclusive, so an end of midnight would hide the banner a day early.
 */

const EMPTY_FORM: AnnouncementFormInput = {
  title: '',
  body: '',
  actionLabel: '',
  actionUrl: '',
  isActive: true,
  startsAt: null,
  endsAt: null,
};

/** Midnight Manila-day start, as the ISO string the column stores. */
function dayStart(d: Date): string {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

/** The last instant of a day, so an inclusive end date reads inclusively. */
function dayEnd(d: Date): string {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export default function AdminAnnouncementForm() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { back } = useRouter();

  const list = useAdminAnnouncements();
  const save = useSaveAnnouncement(isNew ? 'create' : 'edit', id);
  const existing = isNew ? undefined : list.data?.find((a) => a.id === id);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting, errors },
  } = useForm<AnnouncementFormInput, unknown, AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!existing) return;
    reset({
      title: existing.title,
      body: existing.body ?? '',
      actionLabel: existing.actionLabel ?? '',
      actionUrl: existing.actionUrl ?? '',
      isActive: existing.isActive,
      startsAt: existing.startsAt,
      endsAt: existing.endsAt,
    });
  }, [existing, reset]);

  // `useWatch`, not `watch()` — see the note in the item form: `watch()` is
  // not memoizable and makes the React Compiler skip this component.
  const startsAt = useWatch({ control, name: 'startsAt' });
  const endsAt = useWatch({ control, name: 'endsAt' });

  // `today` is only the calendar's notion of "past". An announcement that
  // started last week is legitimate, so anchor to the earlier of today and the
  // existing start — otherwise editing a running banner shows its start greyed
  // out and unreachable.
  const today = todayManila();
  const anchor =
    startsAt && new Date(startsAt) < today ? new Date(startsAt) : today;

  const onSubmit = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      back();
    } catch (e) {
      Alert.alert(
        'Could not save',
        e instanceof Error ? e.message : 'Please try again.',
      );
    }
  });

  if (!isNew && list.isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <ActivityIndicator color={BRONZE} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-canvas">
      <AdminHeader
        title={isNew ? 'New announcement' : 'Edit announcement'}
        onBack={() => back()}
        right={
          <Pressable
            accessibilityRole="button"
            disabled={isSubmitting}
            onPress={onSubmit}
            hitSlop={8}
            className="py-1 active:opacity-70"
          >
            <Text className="font-sans-semibold text-base text-bronze">
              {isSubmitting ? 'Saving…' : 'Save'}
            </Text>
          </Pressable>
        }
      />

      <ScrollView
        contentContainerClassName="gap-5 px-5 pb-16"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Controller
          control={control}
          name="title"
          render={({ field, fieldState }) => (
            <TextField
              label="Title"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="New Makati store"
            />
          )}
        />

        <Controller
          control={control}
          name="body"
          render={({ field, fieldState }) => (
            <TextField
              label="Message"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              multiline
              placeholder="Visit our new and bigger showroom at Glorietta 3."
            />
          )}
        />

        <Controller
          control={control}
          name="actionLabel"
          render={({ field, fieldState }) => (
            <TextField
              label="Button label"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              placeholder="Get directions"
              hint="Leave both this and the link empty for a banner with no action."
            />
          )}
        />

        <Controller
          control={control}
          name="actionUrl"
          render={({ field, fieldState }) => (
            <TextField
              label="Button link"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="https://maps.google.com/?q=…"
              hint="A web link — it opens outside the app."
            />
          )}
        />

        {/* Window --------------------------------------------------------- */}
        <View className="gap-2">
          <Text className="font-sans-medium text-sm text-ink">
            When it shows
          </Text>
          <Text className="font-sans text-xs text-muted">
            Optional. Pick a start, then an end. With no dates the banner runs
            until you switch it off. Tap a chosen day again to start over.
          </Text>
        </View>

        <MonthCalendar
          today={anchor}
          unknownDay="available"
          selection={{
            pickup: startsAt ? new Date(startsAt) : null,
            ret: endsAt ? new Date(endsAt) : null,
          }}
          onChange={(s) => {
            setValue('startsAt', s.pickup ? dayStart(s.pickup) : null);
            setValue('endsAt', s.ret ? dayEnd(s.ret) : null);
          }}
        />

        {errors.endsAt?.message ? (
          <Text className="font-sans text-sm text-overdue">
            {errors.endsAt.message}
          </Text>
        ) : null}

        {startsAt || endsAt ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setValue('startsAt', null);
              setValue('endsAt', null);
            }}
            className="active:opacity-70"
          >
            <Text className="font-sans-medium text-sm text-bronze">
              Clear the dates
            </Text>
          </Pressable>
        ) : null}

        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <View className="flex-row items-center justify-between rounded-2xl bg-canvas-subtle px-4 py-3">
              <View className="flex-1 pr-3">
                <Text className="font-sans-medium text-base text-ink">
                  Switched on
                </Text>
                <Text className="font-sans text-xs text-muted">
                  Off hides it from customers whatever the dates say.
                </Text>
              </View>
              <Switch
                value={field.value}
                onValueChange={field.onChange}
                trackColor={{ true: BRONZE }}
              />
            </View>
          )}
        />
      </ScrollView>
    </View>
  );
}
