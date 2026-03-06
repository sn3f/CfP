import { useQuery } from '@tanstack/react-query';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { ChevronLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { IdTokenClaims } from 'oidc-client-ts';

import type { ScrapperResult } from '@/features/scrapper-results/lib/types';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrapperResultDetailsToolbar } from '@/features/scrapper-results/components/scrapper-result-details-toolbar';
import { ScrapperResultPreview } from '@/features/scrapper-results/components/scrapper-result-preview';
import { getScrapperResultsDetailQueryOptions } from '@/features/scrapper-results/lib/query-options';
import { userManager } from '@/integrations/auth';
import { ADMIN_ROLE } from '@/lib/constants';

export const Route = createFileRoute(
  '/(workspace)/__workspace/scrapper-results/$id',
)({
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
  component: () => {
    const { id } = Route.useParams();
    const {
      data: scrapperResult,
      isPending,
      isError,
    } = useQuery(getScrapperResultsDetailQueryOptions(id));

    if (isPending) return <PageSkeleton />;
    if (isError) return <PageError />;

    return <ScrapperResultDetails scrapperResult={scrapperResult} />;
  },
});

function ScrapperResultDetails({
  scrapperResult,
}: {
  scrapperResult: ScrapperResult;
}) {
  return (
    <>
      <ScrapperResultDetailsToolbar />

      <ScrapperResultPreview scrapperResult={scrapperResult} />
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="size-full flex flex-col gap-2">
      <Skeleton className="w-full h-24" />
      <Skeleton className="size-full" />
      <Skeleton className="w-full h-24" />
    </div>
  );
}

function PageError() {
  const { t } = useTranslation('translation', {
    keyPrefix: 'scrapperResults',
  });
  const router = useRouter();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <X />
        </EmptyMedia>
        <EmptyTitle>{t('notFound')}</EmptyTitle>
        <EmptyDescription>{t('notFoundDetails')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => router.history.back()}>
          <ChevronLeft />
          {t('navigateBack')}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
