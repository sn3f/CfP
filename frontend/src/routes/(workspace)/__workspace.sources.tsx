import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import type { IdTokenClaims } from 'oidc-client-ts';

import { SourcesTable } from '@/features/sources/components/sources-table';
import { userManager } from '@/integrations/auth';
import { ADMIN_ROLE } from '@/lib/constants';

export const Route = createFileRoute('/(workspace)/__workspace/sources')({
  validateSearch: z.object({
    page: z.number().int().nonnegative().catch(0),
    size: z.number().int().positive().catch(10),
    sort: z.string().optional().catch(undefined),
    q: z.string().optional().catch(''),
    sourceStatus: z.enum(['ACTIVE', 'INACTIVE', 'all']).catch('all'),
  }),
  beforeLoad: async () => {
    const user = await userManager.getUser();

    if (!user) {
      throw redirect({ to: '/login' });
    }

    const profile = user.profile as IdTokenClaims & {
      realm_access?: { roles?: Array<string> };
    };

    const roles: Array<string> = profile.realm_access?.roles ?? [];

    if (!Array.isArray(roles) || !roles.includes(ADMIN_ROLE)) {
      throw redirect({ to: '/unauthorized' });
    }
  },
  component: SourcesPage,
});

function SourcesPage() {
  return (
    <div>
      <title> CfP Classifier - Sources </title>

      <SourcesTable />
    </div>
  );
}
