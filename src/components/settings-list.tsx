// Grouped-list primitives for the Settings tab and its pushed pages.
// A settings surface is SettingsGroups of NavRow / SwitchRow separated by
// RowDivider — new options should slot in as rows, not bespoke layouts.

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function SettingsGroup({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.group}>
      {title ? (
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
          {title}
        </ThemedText>
      ) : null}
      <ThemedView type="backgroundElement" style={styles.groupCard}>
        {children}
      </ThemedView>
    </View>
  );
}

export function NavRow({
  icon,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <ThemedText style={styles.rowLabel}>{label}</ThemedText>
      {detail ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          numberOfLines={1}
          style={styles.rowDetail}
        >
          {detail}
        </ThemedText>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </Pressable>
  );
}

export function SwitchRow({
  icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color={theme.textSecondary} />
      <View style={styles.switchBody}>
        <ThemedText>{label}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
        </ThemedText>
      </View>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

export function RowDivider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  group: { gap: Spacing.one },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginLeft: Spacing.two,
  },
  groupCard: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  rowLabel: { flex: 1 },
  rowDetail: { maxWidth: 140 },
  switchBody: { flex: 1, gap: 2 },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(127,127,127,0.3)',
  },
  pressed: { opacity: 0.7 },
});
