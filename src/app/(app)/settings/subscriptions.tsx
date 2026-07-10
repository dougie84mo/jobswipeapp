// Subscriptions — real Stripe billing. Plan state comes from the
// subscriptions table (written by the stripe-webhook edge function);
// checkout and management happen on Stripe-hosted pages via the billing
// edge function. A manual Refresh exists because the webhook can lag the
// browser's return by a few seconds.

import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';

import { RowDivider, SettingsGroup } from '@/components/settings-list';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSession } from '@/features/auth/SessionProvider';
import {
  isUpgrade,
  PLAN_CONNECTION_LIMIT,
  PLAN_LABEL,
  PLAN_PRICE_LABEL,
  TEAM_CAPABLE_PLANS,
  type PaidPlanId,
} from '@/features/billing/entitlements';
import {
  SUBSCRIPTIONS_KEY,
  useEntitlements,
  useOpenCheckout,
  useOpenPortal,
  useSubscriptions,
} from '@/features/billing/queries';
import { useTheme } from '@/hooks/use-theme';

const PRO_SEAT_CHOICES = [1, 2, 5, 10] as const;

const FREELANCER_LIMIT = PLAN_CONNECTION_LIMIT.freelancer;

const UPGRADE_COPY: Record<PaidPlanId, string> = {
  basic: 'Two connected sources, unlimited swipes. For a solo recruiter working a couple of pipelines.',
  pro: 'Five connected sources, plus teams: share connections, shortlists, and activity. Includes one seat; add more for $15 each.',
  team_pro: 'Every source, no cap, and ten seats included. For a full recruiting desk.',
};

export default function SubscriptionsScreen() {
  const theme = useTheme();
  const qc = useQueryClient();
  const session = useSession();
  const userId =
    session.status === 'ready' && session.session
      ? session.session.user.id
      : undefined;
  const subsQuery = useSubscriptions();
  const { entitlements, isLoading } = useEntitlements();
  const checkout = useOpenCheckout();
  const portal = useOpenPortal();

  const ownSubs = (subsQuery.data ?? []).filter((s) => s.user_id === userId);
  const activeSub = ownSubs.find((s) => s.plan === entitlements.plan);
  // RLS only returns other users' rows when they own a team you're on.
  const teamOwnerSub = (subsQuery.data ?? []).find(
    (s) => s.user_id !== userId && TEAM_CAPABLE_PLANS.includes(s.plan),
  );
  const busy = checkout.isPending || portal.isPending;

  const upgrades = (['basic', 'pro', 'team_pro'] as const).filter((p) =>
    isUpgrade(p, entitlements.plan),
  );

  async function startCheckout(plan: PaidPlanId, seats?: number) {
    try {
      await checkout.start(plan, seats);
    } catch (err) {
      Alert.alert('Checkout failed', toMessage(err));
    }
  }

  function pickProSeats() {
    Alert.alert(
      'How many seats?',
      'Pro includes one seat at $20/month. Extra seats are $15 each. You can change this later in Manage billing.',
      [
        { text: 'Cancel', style: 'cancel' },
        ...PRO_SEAT_CHOICES.map((n) => ({
          text: n === 1 ? '1 seat — $20/mo' : `${n} seats — $${20 + (n - 1) * 15}/mo`,
          onPress: () => void startCheckout('pro', n),
        })),
      ],
    );
  }

  function planSummary(): string {
    if (isLoading) return 'Loading…';
    if (entitlements.plan === 'freelancer') {
      return `${FREELANCER_LIMIT} connected source, unlimited swipes`;
    }
    if (activeSub?.status === 'past_due') {
      return 'Payment past due — update your card in Manage billing';
    }
    if (activeSub?.current_period_end) {
      return `Renews ${new Date(activeSub.current_period_end).toLocaleDateString()}`;
    }
    return 'Active';
  }

  const limit = entitlements.connectionLimit;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.flex} edges={['left', 'right']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SettingsGroup title="Current plan">
            <View style={styles.planRow}>
              <Ionicons
                name={
                  entitlements.plan === 'freelancer'
                    ? 'leaf-outline'
                    : 'rocket-outline'
                }
                size={20}
                color={theme.textSecondary}
              />
              <View style={styles.planBody}>
                <ThemedText type="smallBold">
                  {PLAN_LABEL[entitlements.plan]}
                  {TEAM_CAPABLE_PLANS.includes(entitlements.plan)
                    ? ` — ${entitlements.seats} seat${entitlements.seats === 1 ? '' : 's'}`
                    : ''}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {planSummary()}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {limit === null
                    ? 'Unlimited connected sources'
                    : `${limit} connected source${limit === 1 ? '' : 's'}`}
                </ThemedText>
                {teamOwnerSub ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    You’re also on a teammate’s {PLAN_LABEL[teamOwnerSub.plan]} plan.
                  </ThemedText>
                ) : null}
              </View>
              <Pressable
                onPress={() => void qc.invalidateQueries({ queryKey: SUBSCRIPTIONS_KEY })}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Refresh subscription status"
              >
                <Ionicons name="refresh-outline" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>
          </SettingsGroup>

          {upgrades.length > 0 ? (
            <SettingsGroup title="Upgrade">
              {upgrades.map((plan, index) => (
                <View key={plan}>
                  {index > 0 ? <RowDivider /> : null}
                  <PlanOption
                    title={`${PLAN_LABEL[plan]} — ${PLAN_PRICE_LABEL[plan]}`}
                    description={UPGRADE_COPY[plan]}
                    cta={`Upgrade to ${PLAN_LABEL[plan]}`}
                    disabled={busy}
                    onPress={() =>
                      plan === 'pro' ? pickProSeats() : void startCheckout(plan)
                    }
                  />
                </View>
              ))}
            </SettingsGroup>
          ) : null}

          {entitlements.hasBillingAccount ? (
            <SettingsGroup title="Billing">
              <Pressable
                onPress={() =>
                  portal.start().catch((err) => Alert.alert('Couldn’t open billing', toMessage(err)))
                }
                disabled={busy}
                accessibilityRole="button"
                style={({ pressed }) => [styles.manageRow, pressed && styles.pressed]}
              >
                <Ionicons name="card-outline" size={20} color={theme.textSecondary} />
                <ThemedText style={styles.manageLabel}>Manage billing</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Invoices, card, seats, cancel
                </ThemedText>
                <Ionicons name="open-outline" size={16} color={theme.textSecondary} />
              </Pressable>
            </SettingsGroup>
          ) : null}

          <ThemedText type="small" themeColor="textSecondary">
            Payments are processed by Stripe on a secure page outside the app.
            The Freelancer plan stays free: {FREELANCER_LIMIT} connected source,
            unlimited swipes, configurable swipe actions.
          </ThemedText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function PlanOption({
  title,
  description,
  cta,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  cta: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <View style={styles.planOption}>
      <ThemedText type="smallBold">{title}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {description}
      </ThemedText>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.upgradeButton,
          (disabled || pressed) && styles.pressed,
        ]}
      >
        <ThemedText style={styles.upgradeLabel}>
          {disabled ? 'Opening…' : cta}
        </ThemedText>
      </Pressable>
    </View>
  );
}

function toMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  planBody: { flex: 1, gap: 2 },
  planOption: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  upgradeButton: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.two,
    borderRadius: 999,
    alignItems: 'center',
    marginTop: Spacing.one,
  },
  upgradeLabel: { color: 'white', fontWeight: '700' },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  manageLabel: { flex: 1 },
  pressed: { opacity: 0.7 },
});
