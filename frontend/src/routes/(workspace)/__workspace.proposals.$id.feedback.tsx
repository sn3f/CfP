import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  useCanGoBack,
  useRouter,
} from '@tanstack/react-router';
import { ChevronLeft, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

import { CfpFeedbackToolbar } from '@/features/proposals/components/cfp-feedback-toolbar';
import { FeedbackEditTable } from '@/features/proposals/components/feedback-edit-table';
import { getOrCreateUserFeedbackQueryOptions } from '@/features/proposals/lib/feedback-query-options';
import { getCfpDetailQueryOptions } from '@/features/proposals/lib/query-options';

export const Route = createFileRoute(
  '/(workspace)/__workspace/proposals/$id/feedback',
)({
  component: FeedbackPage,
});

function FeedbackPage() {
  const { id: cfpId } = Route.useParams();

  const {
    data: cfp,
    isPending: isCfpPending,
    isError: isCfpError,
  } = useQuery(getCfpDetailQueryOptions(cfpId));

  const {
    data: feedback,
    isPending: isFeedbackPending,
    isError: isFeedbackError,
  } = useQuery({
    ...getOrCreateUserFeedbackQueryOptions(cfpId),
    enabled: !!cfp,
    retry: false,
    staleTime: 0,
  });

  if (isCfpPending || isFeedbackPending) return <PageSkeleton />;
  if (isCfpError || isFeedbackError) return <PageError />;

  return (
    <>
      <CfpFeedbackToolbar cfp={cfp} />

      <FeedbackEditTable feedback={feedback} />
    </>
  );
}

function PageSkeleton() {
  return (
    <div className="size-full flex flex-col gap-2">
      <Skeleton className="w-full h-16" />
      <div className="size-full flex gap-2">
        <Skeleton className="size-full" />
      </div>
    </div>
  );
}

function PageError() {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const router = useRouter();
  const canGoBack = useCanGoBack();

  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <X />
        </EmptyMedia>
        <EmptyTitle>{t('feedback.notFound')}</EmptyTitle>
        <EmptyDescription>{t('feedback.notFoundDetails')}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={() => router.history.back()} disabled={!canGoBack}>
          <ChevronLeft />
          {t('feedback.navigateBack')}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
