import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { FlowHeader } from '@/components/booking/flow-header';
import { SegmentedToggle } from '@/components/catalog/segmented-toggle';

/**
 * The shop's size chart.
 *
 * PLACEHOLDER MEASUREMENTS — these are the figures from the design board, not
 * the shop's own. They must be confirmed against real stock before launch: a
 * customer who books on a wrong chart travels to the shop for nothing, which is
 * the exact problem this app exists to remove.
 */
const CHART: Record<'women' | 'men', { headers: string[]; rows: string[][] }> =
  {
    women: {
      headers: ['Size', 'Bust (cm)', 'Waist (cm)', 'Hips (cm)'],
      rows: [
        ['XS', '76–80', '60–64', '84–88'],
        ['S', '81–85', '65–69', '89–93'],
        ['M', '86–90', '70–74', '94–98'],
        ['L', '91–95', '75–79', '99–103'],
        ['XL', '96–100', '80–84', '104–108'],
      ],
    },
    men: {
      headers: ['Size', 'Chest (cm)', 'Waist (cm)', 'Hips (cm)'],
      rows: [
        ['XS', '86–90', '71–75', '86–90'],
        ['S', '91–96', '76–81', '91–96'],
        ['M', '97–102', '82–87', '97–102'],
        ['L', '103–108', '88–93', '103–108'],
        ['XL', '109–114', '94–99', '109–114'],
      ],
    },
  };

export default function SizeGuide() {
  const [who, setWho] = useState<'women' | 'men'>('women');
  const chart = CHART[who];

  return (
    <View className="flex-1 bg-canvas">
      <FlowHeader title="Size guide" />
      <ScrollView
        contentContainerClassName="gap-6 px-5 pb-10 pt-1"
        showsVerticalScrollIndicator={false}
      >
        <SegmentedToggle
          options={[
            { label: 'Women', value: 'women' },
            { label: 'Men', value: 'men' },
          ]}
          value={who}
          onChange={(v) => setWho(v as 'women' | 'men')}
        />

        <View className="overflow-hidden rounded-2xl border-hairline bg-surface">
          <View className="flex-row bg-canvas-subtle px-4 py-3">
            {chart.headers.map((h, i) => (
              <Text
                key={h}
                className={`font-sans-medium text-xs text-muted ${i === 0 ? 'w-14' : 'flex-1'}`}
              >
                {h}
              </Text>
            ))}
          </View>
          {chart.rows.map((row, ri) => (
            <View
              key={row[0]}
              className={`flex-row px-4 py-3.5 ${ri > 0 ? 'border-t-hairline' : ''}`}
            >
              {row.map((cell, ci) => (
                <Text
                  key={ci}
                  className={`text-sm ${
                    ci === 0
                      ? 'w-14 font-sans-semibold text-ink'
                      : 'flex-1 font-sans text-ink'
                  }`}
                >
                  {cell}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View className="gap-1 rounded-2xl bg-bronze-soft p-4">
          <Text className="font-sans-medium text-sm text-bronze-deep">
            Not sure about your size?
          </Text>
          <Text className="font-sans text-xs leading-5 text-bronze-deep">
            Book a fitting when you reserve — try it on at the shop before your
            rental dates. A fitting never holds the item.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
