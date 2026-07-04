import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { OCCASIONS, type Occasion } from '@/features/catalog/types';

/** The subset of filters the sheet controls (category + gender live in the header). */
export type SheetFilters = {
  occasion: Occasion | null;
  size: string | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export const EMPTY_SHEET_FILTERS: SheetFilters = {
  occasion: null,
  size: null,
  minPrice: null,
  maxPrice: null,
};

// Preset price bands, in PHP/day — a slider would need a lib; chips read cleaner.
const PRICE_BANDS: { label: string; min: number | null; max: number | null }[] =
  [
    { label: 'Any price', min: null, max: null },
    { label: 'Under ₱500', min: null, max: 499 },
    { label: '₱500–1,000', min: 500, max: 1000 },
    { label: '₱1,000–2,000', min: 1000, max: 2000 },
    { label: '₱2,000+', min: 2000, max: null },
  ];

const OCCASION_LABELS: Record<Occasion, string> = {
  wedding: 'Wedding',
  debut: 'Debut',
  formal: 'Formal',
  cosplay: 'Cosplay',
  school: 'School',
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={`rounded-full px-4 py-2.5 active:opacity-80 ${
        active
          ? 'bg-grape dark:bg-grape-soft'
          : 'bg-canvas-subtle dark:bg-night-800'
      }`}
    >
      <Text
        className={`font-sans-semibold text-sm ${
          active ? 'text-white' : 'text-ink dark:text-cloud'
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="font-sans-bold text-base text-ink dark:text-cloud">
        {title}
      </Text>
      <View className="flex-row flex-wrap gap-2.5">{children}</View>
    </View>
  );
}

/**
 * Bottom-sheet filter panel (plain RN Modal — no bottom-sheet dependency). Edits
 * a local draft so changes only take effect on Apply; Clear resets to empty.
 * `sizes` are the size options available in the current listing.
 *
 * The draft lives in `SheetBody`, which only mounts while the sheet is open — so
 * it re-seeds from the live filters on each open via its `useState` initializer,
 * no syncing effect required.
 */
export function FilterSheet(props: {
  visible: boolean;
  value: SheetFilters;
  sizes: string[];
  onApply: (next: SheetFilters) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={props.visible}
      transparent
      animationType="slide"
      onRequestClose={props.onClose}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close filters"
        onPress={props.onClose}
        className="flex-1 bg-black/40"
      />
      {props.visible ? <SheetBody {...props} /> : null}
    </Modal>
  );
}

function SheetBody({
  value,
  sizes,
  onApply,
  onClose,
}: {
  value: SheetFilters;
  sizes: string[];
  onApply: (next: SheetFilters) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<SheetFilters>(value);

  const activeBand = PRICE_BANDS.find(
    (b) => b.min === draft.minPrice && b.max === draft.maxPrice,
  );

  return (
    <View
      className="rounded-t-[32px] bg-canvas px-6 pt-3 dark:bg-night-950"
      style={{ paddingBottom: insets.bottom + 16 }}
    >
      <View className="mb-4 items-center">
        <View className="h-1.5 w-10 rounded-full bg-ink/15 dark:bg-cloud/20" />
      </View>

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="font-sans-extrabold text-2xl text-ink dark:text-cloud">
          Filters
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setDraft(EMPTY_SHEET_FILTERS)}
        >
          <Text className="font-sans-semibold text-sm text-grape dark:text-grape-soft">
            Clear all
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6"
        className="max-h-[60vh]"
      >
        <Section title="Occasion">
          <Chip
            label="All"
            active={draft.occasion === null}
            onPress={() => setDraft((d) => ({ ...d, occasion: null }))}
          />
          {OCCASIONS.map((o) => (
            <Chip
              key={o}
              label={OCCASION_LABELS[o]}
              active={draft.occasion === o}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  occasion: d.occasion === o ? null : o,
                }))
              }
            />
          ))}
        </Section>

        {sizes.length > 0 ? (
          <Section title="Size">
            <Chip
              label="All"
              active={draft.size === null}
              onPress={() => setDraft((d) => ({ ...d, size: null }))}
            />
            {sizes.map((s) => (
              <Chip
                key={s}
                label={s}
                active={draft.size === s}
                onPress={() =>
                  setDraft((d) => ({ ...d, size: d.size === s ? null : s }))
                }
              />
            ))}
          </Section>
        ) : null}

        <Section title="Price / day">
          {PRICE_BANDS.map((band) => (
            <Chip
              key={band.label}
              label={band.label}
              active={activeBand?.label === band.label}
              onPress={() =>
                setDraft((d) => ({
                  ...d,
                  minPrice: band.min,
                  maxPrice: band.max,
                }))
              }
            />
          ))}
        </Section>
      </ScrollView>

      <View className="mt-5">
        <Button
          label="Show results"
          onPress={() => {
            onApply(draft);
            onClose();
          }}
        />
      </View>
    </View>
  );
}
