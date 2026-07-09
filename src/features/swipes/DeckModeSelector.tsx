// The requisition screen's mode dropdown: a pill showing the current mode
// that opens a top-anchored menu (transparent Modal — native-stack custom
// header titles with overlays are fragile cross-platform, so this lives in
// the screen body).

import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { DECK_MODES, type DeckMode } from './deck-modes';

export function DeckModeSelector({
  mode,
  onChange,
}: {
  mode: DeckMode;
  onChange: (mode: DeckMode) => void;
}) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const current = DECK_MODES.find((m) => m.id === mode) ?? DECK_MODES[0];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Deck mode: ${current.label}. Change mode`}
        style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      >
        <Ionicons name={current.icon} size={16} color={theme.text} />
        <ThemedText type="smallBold">{current.label} mode</ThemedText>
        <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <ThemedView type="backgroundElement" style={styles.menu}>
            {DECK_MODES.map((m) => {
              const selected = m.id === mode;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => {
                    setOpen(false);
                    if (!selected) onChange(m.id);
                  }}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected }}
                  style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}
                >
                  <Ionicons name={m.icon} size={18} color={theme.text} />
                  <View style={styles.menuText}>
                    <ThemedText type="smallBold">{m.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {m.description}
                    </ThemedText>
                  </View>
                  {selected ? (
                    <Ionicons name="checkmark" size={18} color="#208AEF" />
                  ) : null}
                </Pressable>
              );
            })}
          </ThemedView>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: 999,
    backgroundColor: 'rgba(127,127,127,0.18)',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingTop: 96,
    paddingHorizontal: Spacing.four,
  },
  menu: {
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.one,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.two,
  },
  menuText: { flex: 1, gap: 2 },
  pressed: { opacity: 0.7 },
});
