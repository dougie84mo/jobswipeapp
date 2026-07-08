import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import { useIntegration } from '@/features/integrations/queries';
import { useRequisitions } from '@/features/integrations/requisitions';
import {
  actionsForDirection,
  useIntegrationSettings,
  useUpsertIntegrationSettings,
} from '@/features/integrations/settings';
import {
  capabilitiesFor,
  listStages,
  listTags,
} from '@/ats/client';
import { getAdapter } from '@/ats/registry';
import type {
  ActionDescriptor,
  AtsCapabilities,
  EmailTemplate,
  Stage,
  SwipeDirection,
  Tag,
} from '@/ats/types';

type ActionType = ActionDescriptor['type'];

const DIRECTION_META: Record<
  SwipeDirection,
  { label: string; subtitle: string }
> = {
  right: { label: 'Right swipe', subtitle: 'Save / advance candidates' },
  left: { label: 'Left swipe', subtitle: 'Pass / reject candidates' },
  up: { label: 'Up swipe', subtitle: 'Boost / highlight candidates' },
};

const ACTION_TYPE_LABEL: Record<ActionType, string> = {
  advance_stage: 'Advance stage',
  reject: 'Reject',
  apply_tag: 'Apply tag',
  send_template: 'Send template',
  add_note: 'Add note',
  local_only: 'Record locally only',
};

export default function IntegrationSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const integrationQuery = useIntegration(id);
  const integration = integrationQuery.data ?? null;
  const settingsQuery = useIntegrationSettings(id);
  const upsert = useUpsertIntegrationSettings();
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  // On a team-shared connection a non-owner edits their PERSONAL overrides;
  // until they save, the drafts show the owner's team defaults.
  const isOwner = Boolean(integration && userId && integration.user_id === userId);
  const hasOwnRow = Boolean(
    userId && (settingsQuery.data ?? []).some((r) => r.user_id === userId),
  );
  const requisitionsQuery = useRequisitions(integration);
  // Stages can vary per requisition for some providers, but at the
  // integration-settings level we pick from the first requisition's stages.
  // Adapters where stages truly differ per req will need a per-req override
  // later; flagged as a TODO so we don't forget.
  const firstReqExternalId = requisitionsQuery.data?.[0]?.externalId;

  const stagesQuery = useQuery({
    queryKey: ['stages', integration?.id, firstReqExternalId],
    enabled: Boolean(integration && firstReqExternalId),
    queryFn: async (): Promise<Stage[]> => {
      if (!integration || !firstReqExternalId) return [];
      return listStages(
        { id: integration.id, provider: integration.provider },
        firstReqExternalId,
      );
    },
  });
  const tagsQuery = useQuery({
    queryKey: ['tags', integration?.id],
    enabled: Boolean(integration),
    queryFn: async (): Promise<Tag[]> => {
      if (!integration) return [];
      return listTags({ id: integration.id, provider: integration.provider });
    },
  });
  const templatesQuery = useQuery({
    queryKey: ['templates', integration?.id],
    enabled: Boolean(integration),
    queryFn: async (): Promise<EmailTemplate[]> => {
      if (!integration) return [];
      const adapter = getAdapter(integration.provider);
      if (!adapter.listEmailTemplates) return [];
      return adapter.listEmailTemplates({ apiKey: 'mock-key' });
    },
  });

  const capabilities: AtsCapabilities | null = integration
    ? capabilitiesFor(integration.provider)
    : null;

  const [draft, setDraft] = useState<Record<SwipeDirection, ActionDescriptor[]>>({
    right: [],
    left: [],
    up: [],
  });
  const [dirty, setDirty] = useState(false);

  // Seed the draft once the settings query lands (inheritance-resolved: own
  // rows win, else the owner's team defaults).
  useEffect(() => {
    if (settingsQuery.data && !dirty) {
      setDraft({
        right: actionsForDirection(settingsQuery.data, 'right', userId),
        left: actionsForDirection(settingsQuery.data, 'left', userId),
        up: actionsForDirection(settingsQuery.data, 'up', userId),
      });
    }
  }, [settingsQuery.data, dirty, userId]);

  const [pickerState, setPickerState] = useState<PickerState>(null);

  async function handleSave() {
    if (!integration || !userId) return;
    try {
      await Promise.all(
        (['right', 'left', 'up'] as SwipeDirection[]).map((direction) =>
          upsert.mutateAsync({
            integrationId: integration.id,
            direction,
            actions: draft[direction],
            userId,
          }),
        ),
      );
      setDirty(false);
      Alert.alert('Saved', 'Swipe actions updated.');
      router.back();
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Unknown error');
    }
  }

  function updateDirection(direction: SwipeDirection, actions: ActionDescriptor[]) {
    setDirty(true);
    setDraft((prev) => ({ ...prev, [direction]: actions }));
  }

  function handleAddRequest(direction: SwipeDirection) {
    setPickerState({ step: 'type', direction });
  }

  function handlePickType(direction: SwipeDirection, type: ActionType) {
    // Types with no parameter: append immediately and close.
    if (type === 'reject' || type === 'local_only' || type === 'add_note') {
      if (type === 'add_note') {
        // For the mock UI we hardcode a sensible note. The real settings UI
        // would let the recruiter type a custom note here.
        appendAction(direction, {
          type: 'add_note',
          text: 'Saved via Recruit Swipe on {{date}}',
        });
      } else if (type === 'reject') {
        appendAction(direction, { type: 'reject' });
      } else {
        appendAction(direction, { type: 'local_only' });
      }
      setPickerState(null);
      return;
    }
    setPickerState({ step: 'value', direction, type });
  }

  function handlePickValue(direction: SwipeDirection, type: ActionType, valueId: string) {
    switch (type) {
      case 'advance_stage':
        appendAction(direction, { type: 'advance_stage', stage_id: valueId });
        break;
      case 'apply_tag':
        appendAction(direction, { type: 'apply_tag', tag_id: valueId });
        break;
      case 'send_template':
        appendAction(direction, { type: 'send_template', template_id: valueId });
        break;
      default:
        break;
    }
    setPickerState(null);
  }

  function appendAction(direction: SwipeDirection, action: ActionDescriptor) {
    updateDirection(direction, [...draft[direction], action]);
  }

  function removeAction(direction: SwipeDirection, index: number) {
    updateDirection(
      direction,
      draft[direction].filter((_, i) => i !== index),
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Swipe actions' }} />
      <SafeAreaView style={styles.inner} edges={['bottom', 'left', 'right']}>
        {!integration ? (
          <ThemedText themeColor="textSecondary">Integration not found.</ThemedText>
        ) : !capabilities ? (
          <ThemedText themeColor="textSecondary">Loading…</ThemedText>
        ) : (
          <FlatList
            data={['right', 'left', 'up'] as SwipeDirection[]}
            keyExtractor={(d) => d}
            ItemSeparatorComponent={() => <View style={{ height: Spacing.three }} />}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.header}>
                <ThemedText themeColor="textSecondary">
                  Configure what happens in {integration.display_label ?? integration.provider}{' '}
                  when you swipe. Actions run top-to-bottom on each swipe; the outcome is
                  recorded on the swipe history.
                </ThemedText>
                {!isOwner ? (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.sharedNote}>
                    {hasOwnRow
                      ? 'Shared connection — you’re editing your personal overrides of the team defaults.'
                      : 'Shared connection — these are the team defaults. Saving creates your personal overrides.'}
                  </ThemedText>
                ) : null}
              </View>
            }
            renderItem={({ item: direction }) => (
              <DirectionSection
                direction={direction}
                actions={draft[direction]}
                stages={stagesQuery.data ?? []}
                tags={tagsQuery.data ?? []}
                templates={templatesQuery.data ?? []}
                onAdd={() => handleAddRequest(direction)}
                onRemove={(index) => removeAction(direction, index)}
              />
            )}
            ListFooterComponent={
              <Pressable
                onPress={handleSave}
                disabled={!dirty || upsert.isPending}
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.pressed,
                  (!dirty || upsert.isPending) && styles.disabled,
                ]}
              >
                <ThemedText style={styles.saveButtonText}>
                  {upsert.isPending ? 'Saving…' : dirty ? 'Save changes' : 'No changes'}
                </ThemedText>
              </Pressable>
            }
          />
        )}
      </SafeAreaView>
      <ActionPickerModal
        state={pickerState}
        capabilities={capabilities}
        stages={stagesQuery.data ?? []}
        tags={tagsQuery.data ?? []}
        templates={templatesQuery.data ?? []}
        onPickType={handlePickType}
        onPickValue={handlePickValue}
        onClose={() => setPickerState(null)}
      />
    </ThemedView>
  );
}

function DirectionSection({
  direction,
  actions,
  stages,
  tags,
  templates,
  onAdd,
  onRemove,
}: {
  direction: SwipeDirection;
  actions: ActionDescriptor[];
  stages: Stage[];
  tags: Tag[];
  templates: EmailTemplate[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  const meta = DIRECTION_META[direction];
  return (
    <ThemedView type="backgroundElement" style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <ThemedText type="smallBold">{meta.label}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {meta.subtitle}
          </ThemedText>
        </View>
      </View>

      {actions.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No actions configured. Swipe will only record direction.
        </ThemedText>
      ) : (
        <View style={{ gap: Spacing.two }}>
          {actions.map((action, index) => (
            <View key={index} style={styles.actionRow}>
              <ThemedText type="small">
                {index + 1}. {describeAction(action, { stages, tags, templates })}
              </ThemedText>
              <Pressable onPress={() => onRemove(index)} hitSlop={8}>
                <ThemedText type="linkPrimary">Remove</ThemedText>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={onAdd}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
      >
        <ThemedText type="linkPrimary">+ Add action</ThemedText>
      </Pressable>
    </ThemedView>
  );
}

type PickerState =
  | null
  | { step: 'type'; direction: SwipeDirection }
  | { step: 'value'; direction: SwipeDirection; type: ActionType };

function ActionPickerModal({
  state,
  capabilities,
  stages,
  tags,
  templates,
  onPickType,
  onPickValue,
  onClose,
}: {
  state: PickerState;
  capabilities: AtsCapabilities | null;
  stages: Stage[];
  tags: Tag[];
  templates: EmailTemplate[];
  onPickType: (direction: SwipeDirection, type: ActionType) => void;
  onPickValue: (direction: SwipeDirection, type: ActionType, valueId: string) => void;
  onClose: () => void;
}) {
  const visible = state !== null;

  const supportedTypes = useMemo<ActionType[]>(() => {
    if (!capabilities) return [];
    const out: ActionType[] = [];
    if (capabilities.canAdvanceStage) out.push('advance_stage');
    if (capabilities.canApplyTag) out.push('apply_tag');
    if (capabilities.canSendTemplate) out.push('send_template');
    if (capabilities.canReject) out.push('reject');
    if (capabilities.canAddNote) out.push('add_note');
    out.push('local_only');
    return out;
  }, [capabilities]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <ThemedView type="backgroundElement" style={styles.modalCard}>
            {state?.step === 'type' ? (
              <>
                <ThemedText type="smallBold">Pick action type</ThemedText>
                {supportedTypes.map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => onPickType(state.direction, t)}
                    style={({ pressed }) => [styles.pickerRow, pressed && styles.pressed]}
                  >
                    <ThemedText>{ACTION_TYPE_LABEL[t]}</ThemedText>
                  </Pressable>
                ))}
              </>
            ) : state?.step === 'value' ? (
              <ValuePicker
                type={state.type}
                stages={stages}
                tags={tags}
                templates={templates}
                onPick={(valueId) => onPickValue(state.direction, state.type, valueId)}
                onBack={onClose}
              />
            ) : null}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [styles.pickerCancel, pressed && styles.pressed]}
            >
              <ThemedText themeColor="textSecondary">Cancel</ThemedText>
            </Pressable>
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ValuePicker({
  type,
  stages,
  tags,
  templates,
  onPick,
  onBack,
}: {
  type: ActionType;
  stages: Stage[];
  tags: Tag[];
  templates: EmailTemplate[];
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  let items: { id: string; label: string }[] = [];
  let title = 'Pick a value';
  if (type === 'advance_stage') {
    title = 'Pick stage';
    items = stages.map((s) => ({ id: s.id, label: s.name }));
  } else if (type === 'apply_tag') {
    title = 'Pick tag';
    items = tags.map((t) => ({ id: t.id, label: t.name }));
  } else if (type === 'send_template') {
    title = 'Pick template';
    items = templates.map((t) => ({ id: t.id, label: t.name }));
  }
  return (
    <>
      <ThemedText type="smallBold">{title}</ThemedText>
      {items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          No options available from this ATS yet.
        </ThemedText>
      ) : (
        items.map((it) => (
          <Pressable
            key={it.id}
            onPress={() => onPick(it.id)}
            style={({ pressed }) => [styles.pickerRow, pressed && styles.pressed]}
          >
            <ThemedText>{it.label}</ThemedText>
          </Pressable>
        ))
      )}
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [styles.pickerCancel, pressed && styles.pressed]}
      >
        <ThemedText themeColor="textSecondary">Back</ThemedText>
      </Pressable>
    </>
  );
}

function describeAction(
  action: ActionDescriptor,
  catalogs: { stages: Stage[]; tags: Tag[]; templates: EmailTemplate[] },
): string {
  switch (action.type) {
    case 'advance_stage': {
      const name = catalogs.stages.find((s) => s.id === action.stage_id)?.name;
      return `Advance to ${name ?? action.stage_id}`;
    }
    case 'apply_tag': {
      const name = catalogs.tags.find((t) => t.id === action.tag_id)?.name;
      return `Apply tag: ${name ?? action.tag_id}`;
    }
    case 'send_template': {
      const name = catalogs.templates.find((t) => t.id === action.template_id)?.name;
      return `Send template: ${name ?? action.template_id}`;
    }
    case 'reject':
      return action.reason_id ? `Reject (${action.reason_id})` : 'Reject';
    case 'add_note':
      return `Add note: "${action.text}"`;
    case 'local_only':
      return 'Record locally only';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, padding: Spacing.four },
  listContent: { gap: Spacing.three, paddingBottom: Spacing.four },
  header: { marginBottom: Spacing.three, gap: Spacing.two },
  sharedNote: { fontStyle: 'italic' },
  section: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  addButton: { alignSelf: 'flex-start' },
  saveButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: Spacing.three,
  },
  saveButtonText: { color: 'white', fontWeight: '700' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: { padding: Spacing.three },
  modalCard: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
    gap: Spacing.two,
    maxHeight: '80%',
  },
  pickerRow: {
    paddingVertical: Spacing.two,
  },
  pickerCancel: {
    paddingVertical: Spacing.three,
    alignSelf: 'flex-end',
  },
});
