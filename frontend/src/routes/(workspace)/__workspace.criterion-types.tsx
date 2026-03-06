import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import type { IdTokenClaims } from 'oidc-client-ts';

import { CriterionTypesTable } from '@/features/criterion-types/components/criterion-types-table';
import { userManager } from '@/integrations/auth';
import { ADMIN_ROLE } from '@/lib/constants';

export const Route = createFileRoute(
  '/(workspace)/__workspace/criterion-types',
)({
  validateSearch: z.object({
    page: z.number().int().nonnegative().catch(0),
    size: z.number().int().positive().catch(10),
    sort: z.string().optional().catch(undefined),
    q: z.string().optional().catch(''),
    hard: z.boolean().optional().catch(undefined),
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
  component: CriterionTypesPage,
});

function CriterionTypesPage() {
  return (
    <div>
      <title> CfP Classifier - Criterion Types </title>

      <CriterionTypesTable />
    </div>
  );
}
