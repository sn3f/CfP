import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import type { IdTokenClaims } from 'oidc-client-ts';

import { ScrapperResultsTable } from '@/features/scrapper-results/components/scrapper-results-table';
import { SCRAPPER_RESULT_STATUS_OPTIONS } from '@/features/scrapper-results/lib/constants';
import { userManager } from '@/integrations/auth';
import { ADMIN_ROLE } from '@/lib/constants';

export const Route = createFileRoute(
  '/(workspace)/__workspace/scrapper-results/',
)({
  validateSearch: z.object({
    page: z.number().int().nonnegative().catch(0),
    size: z.number().int().positive().catch(10),
    sort: z.string().optional().catch(undefined),
    q: z.string().optional().catch(''),
    scrapperResultStatus: z
      .enum([
        ...SCRAPPER_RESULT_STATUS_OPTIONS.map((option) => option.value),
        'all',
      ])
      .catch('all'),
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
  component: ScrapperResultsPage,
});

function ScrapperResultsPage() {
  return (
    <div>
      <title> CfP Classifier - Scrapper Results </title>

      <ScrapperResultsTable />
    </div>
  );
}
