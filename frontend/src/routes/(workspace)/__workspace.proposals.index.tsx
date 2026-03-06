import { createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';
import z from 'zod';

import CfPTable from '@/features/proposals/components/cfp-table';

export const Route = createFileRoute('/(workspace)/__workspace/proposals/')({
  validateSearch: z.object({
    page: z.number().int().nonnegative().catch(0),
    size: z.number().int().positive().catch(10),

    sort: z.string().optional().catch('match,desc').default('match,desc'),

    q: z.string().optional().catch(''),
    region: z.string().optional().catch(''),
    theme: z.string().optional().catch(''),

    eligible: z.enum(['true', 'false', 'all']).catch('true'),
    deadline: z.string().catch(format(new Date(), 'yyyy-MM-dd')),
    match: z.coerce.number().min(0).max(100).optional().default(50),
  }),
  component: CfpPage,
});

function CfpPage() {
  return (
    <div>
      <title> CfP Classifier - Proposals </title>

      <CfPTable />
    </div>
  );
}
