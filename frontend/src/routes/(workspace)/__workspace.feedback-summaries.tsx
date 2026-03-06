import { createFileRoute, redirect } from '@tanstack/react-router';
import z from 'zod';
import type { IdTokenClaims } from 'oidc-client-ts';

import { FeedbackSummariesTable } from '@/features/feedback-summaries/components/feedback-summaries-table';
import { userManager } from '@/integrations/auth';
import { ADMIN_ROLE } from '@/lib/constants';

export const Route = createFileRoute(
  '/(workspace)/__workspace/feedback-summaries',
)({
  validateSearch: z.object({
    page: z.number().int().nonnegative().catch(0),
    size: z.number().int().positive().catch(10),
    sort: z.string().optional().catch(undefined),
    q: z.string().optional().catch(''),
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
  component: FeedbackSummariesPage,
});

function FeedbackSummariesPage() {
  return (
    <div>
      <title> CfP Classifier - Feedback Summaries </title>

      <FeedbackSummariesTable />
    </div>
  );
}
