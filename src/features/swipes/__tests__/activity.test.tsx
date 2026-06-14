// Tests the already-built per-action retry path (useRetryAction): it re-runs the
// failed action through the executor, splices the new result back at the same
// index, persists via the set_swipe_executed_actions RPC, and surfaces errors.
//
// The executor and Supabase client are mocked so the test exercises only the
// hook's orchestration, not the network/adapter layers.

import { act, renderHook } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import type { ExecutedAction } from '@/ats/types';
import { type ActivityRow, useRetryAction } from '@/features/swipes/activity';

const mockExecuteActions = jest.fn();
const mockRpc = jest.fn();

jest.mock('@/features/swipes/execute-actions', () => ({
  executeActions: (...args: unknown[]) => mockExecuteActions(...args),
}));
jest.mock('@/lib/supabase', () => ({
  getSupabase: () => ({ rpc: (...args: unknown[]) => mockRpc(...args) }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    // gcTime 0 so no 5-minute cache timer lingers and keeps Jest from exiting.
    defaultOptions: {
      mutations: { retry: false, gcTime: 0 },
      queries: { retry: false, gcTime: 0 },
    },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const failedAction: ExecutedAction = {
  descriptor: { type: 'advance_stage', stage_id: 'stage-1' },
  status: 'failure',
  message: 'boom',
  executedAt: '2026-01-01T00:00:00Z',
};

const baseRow: ActivityRow = {
  swipe_id: 'swipe-1',
  direction: 'right',
  executed_actions: [failedAction],
  created_at: '2026-01-01T00:00:00Z',
  candidate_external_id: 'cand-1',
  candidate_full_name: 'Test Candidate',
  candidate_photo_url: null,
  candidate_headline: null,
  requisition_external_id: 'req-1',
  requisition_title: 'Engineer',
};

beforeEach(() => {
  mockExecuteActions.mockReset();
  mockRpc.mockReset();
});

test('re-runs the failed action and writes the new result back at the same index', async () => {
  const newResult: ExecutedAction = {
    descriptor: failedAction.descriptor,
    status: 'success',
    executedAt: '2026-01-01T01:00:00Z',
  };
  mockExecuteActions.mockResolvedValue([newResult]);
  mockRpc.mockResolvedValue({ error: null });

  const { result } = renderHook(() => useRetryAction(), { wrapper });
  await act(async () => {
    await result.current.mutateAsync({
      integrationId: 'int-1',
      provider: 'greenhouse',
      row: baseRow,
      actionIndex: 0,
    });
  });

  // Executor invoked with the integration ref, requisition, and the failed
  // action's descriptor only.
  expect(mockExecuteActions).toHaveBeenCalledTimes(1);
  const [ref, reqId, candidate, actions] = mockExecuteActions.mock.calls[0];
  expect(ref).toEqual({ id: 'int-1', provider: 'greenhouse' });
  expect(reqId).toBe('req-1');
  expect(candidate.externalId).toBe('cand-1');
  expect(actions).toEqual([failedAction.descriptor]);

  // The new result is spliced in at index 0 and persisted.
  expect(mockRpc).toHaveBeenCalledWith('set_swipe_executed_actions', {
    p_swipe_id: 'swipe-1',
    p_executed_actions: [newResult],
  });
});

test('throws and skips the executor when the action index no longer exists', async () => {
  const { result } = renderHook(() => useRetryAction(), { wrapper });
  await act(async () => {
    await expect(
      result.current.mutateAsync({
        integrationId: 'int-1',
        provider: 'greenhouse',
        row: baseRow,
        actionIndex: 5,
      }),
    ).rejects.toThrow('no longer exists');
  });
  expect(mockExecuteActions).not.toHaveBeenCalled();
  expect(mockRpc).not.toHaveBeenCalled();
});

test('surfaces a persistence (RPC) error', async () => {
  mockExecuteActions.mockResolvedValue([
    { descriptor: failedAction.descriptor, status: 'success', executedAt: 'x' },
  ]);
  mockRpc.mockResolvedValue({ error: new Error('rpc failed') });

  const { result } = renderHook(() => useRetryAction(), { wrapper });
  await act(async () => {
    await expect(
      result.current.mutateAsync({
        integrationId: 'int-1',
        provider: 'greenhouse',
        row: baseRow,
        actionIndex: 0,
      }),
    ).rejects.toThrow('rpc failed');
  });
});
