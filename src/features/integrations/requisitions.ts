// Requisitions for a connected integration.
//
// Today this hook calls the local adapter through the ats client facade,
// returning the live list every time. When real providers come online and
// hitting their APIs on every screen mount becomes expensive, this hook is
// the place to switch to a Postgres cache (the `requisitions` table) with
// background refresh — UI code keeps calling useRequisitions(integration)
// and doesn't see the difference.

import { useQuery } from '@tanstack/react-query';

import { listRequisitions } from '@/ats/client';
import type { Requisition } from '@/ats/types';
import type { IntegrationRow } from '@/features/integrations/queries';

export function useRequisitions(integration: IntegrationRow | null | undefined) {
  return useQuery({
    queryKey: ['requisitions', integration?.id],
    enabled: Boolean(integration),
    queryFn: async (): Promise<Requisition[]> => {
      if (!integration) return [];
      const page = await listRequisitions({
        id: integration.id,
        provider: integration.provider,
      });
      return page.items;
    },
  });
}
