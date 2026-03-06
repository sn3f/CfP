import { useQuery } from '@tanstack/react-query';
import {
  createFileRoute,
  useNavigate,
  useRouter,
  useSearch,
} from '@tanstack/react-router';
import { Bot, ChevronLeft, FolderCog, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import type { CfpAnalysis } from '@/lib/types';
import { ChatCfpShortSummary } from '@/features/proposals/components/chat-cfp-short-summary';
import { ChatTab } from '@/features/proposals/components/chat-tab';
import { OverviewTab } from '@/features/proposals/components/overview-tab';
import { getCfpDetailQueryOptions } from '@/features/proposals/lib/query-options';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CfpToolbar } from '@/features/proposals/components/cfp-toolbar';
import { EditModeProvider } from '@/features/proposals/components/edit-mode-context';

export const Route = createFileRoute('/(workspace)/__workspace/proposals/$id/')(
  {
    validateSearch: z.object({
      tab: z.enum(['overview', 'chat']).default('overview'),
    }),
    component: () => {
      const { id } = Route.useParams();
      const {
        data: cfp,
        isPending,
        isError,
      } = useQuery(getCfpDetailQueryOptions(id));

      if (isPending) return <PageSkeleton />;
      if (isError) return <PageError />;

      return <CfpDetails cfp={cfp} />;
    },
  },
);

export function CfpDetails({ cfp }: { cfp: CfpAnalysis | undefined }) {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
  const navigate = useNavigate({ from: Route.fullPath });
  const { tab } = useSearch({
    from: '/(workspace)/__workspace/proposals/$id/',
  });

  if (!cfp) {
    return <PageError />;
  }

  return (
    <EditModeProvider>
      <div className="flex flex-col h-[calc(100vh-6rem)] gap-2 overflow-hidden">
        <div className="shrink-0">
          <CfpToolbar cfp={cfp} />
        </div>

        <Tabs
          defaultValue={tab}
          onValueChange={() => { }}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="shrink-0">
            <ScrollArea>
              <TabsList className="mb-2 w-full border-b-0 inline-flex items-center justify-between">
                <TabsTrigger
                  value="overview"
                  className="flex-1"
                  onClick={() => {
                    navigate({
                      search: (old) => ({ ...old, tab: 'overview' }),
                      replace: true,
                    });
                  }}
                >
                  <FolderCog
                    className="-ms-0.5 me-1.5 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t('overview.tab')}
                </TabsTrigger>
                <TabsTrigger
                  value="chat"
                  className="group flex-1"
                  onClick={() => {
                    navigate({
                      search: (old) => ({ ...old, tab: 'chat' }),
                      replace: true,
                    });
                  }}
                >
                  <Bot
                    className="-ms-0.5 me-1.5 opacity-60"
                    size={16}
                    aria-hidden="true"
                  />
                  {t('chat.tab')}
                  <Badge className="ms-1.5 transition-opacity group-data-[state=inactive]:opacity-50">
                    {t('chat.aiPowered')}
                  </Badge>
                </TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          <TabsContent
            value="overview"
            className="flex-1 overflow-y-auto min-h-0"
          >
            <OverviewTab cfp={cfp} />
          </TabsContent>

          <TabsContent
            value="chat"
            className="flex flex-col flex-1 h-full min-h-0 overflow-hidden pb-2 mt-0"
          >
            <div className="flex flex-row gap-2 flex-1 min-h-0">
              <ChatCfpShortSummary cfp={cfp} />
              <ChatTab className="flex-1 h-full" cfp={cfp} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </EditModeProvider>
  );
}

function PageSkeleton() {
  return (
    <div className="size-full flex flex-col gap-2">
      <Skeleton className="size-full" />
      <div className="size-full flex gap-2">
        <Skeleton className="size-full" />
        <Skeleton className="size-full" />
        <Skeleton className="size-full" />
      </div>
      <div className="size-full flex gap-2">
        <Skeleton className="size-full" />
        <Skeleton className="size-full" />
      </div>
    </div>
  );
}

function PageError() {
  const { t } = useTranslation('translation', { keyPrefix: 'workspace.cfp' });
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
