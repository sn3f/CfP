import { useNavigate } from '@tanstack/react-router';
import { CheckIcon, X, XIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';

import type { ScrapperResult } from '@/features/scrapper-results/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useScrapperResultMutations } from '@/features/scrapper-results/hooks/use-scrapper-results-mutations';
import { cn } from '@/lib/utils';

export function ScrapperResultPreview({
  scrapperResult,
}: {
  scrapperResult: ScrapperResult;
}) {
  const { t } = useTranslation('translation', { keyPrefix: 'scrapperResults' });
  const navigate = useNavigate();
  const { classifyMutation, rejectMutation } = useScrapperResultMutations();
  const mdxContent = scrapperResult.promptContext;

  const handleClassify = () => {
    classifyMutation.mutate(scrapperResult.id, {
      onSuccess: () => {
        navigate({
          to: '/scrapper-results',
          search: (prevSearch) => ({
            ...prevSearch,
            page: prevSearch.page ?? 0,
            size: prevSearch.size ?? 10,
            sort: prevSearch.sort ?? 'timestamp,desc',
            scrapperResultStatus: prevSearch.scrapperResultStatus ?? 'all',
          }),
        });
      },
    });
  };

  const handleReject = () => {
    rejectMutation.mutate(scrapperResult.id, {
      onSuccess: () => {
        navigate({
          to: '/scrapper-results',
          search: (prevSearch) => ({
            ...prevSearch,
            page: prevSearch.page ?? 0,
            size: prevSearch.size ?? 10,
            sort: prevSearch.sort ?? 'timestamp,desc',
            scrapperResultStatus: prevSearch.scrapperResultStatus ?? 'all',
          }),
        });
      },
    });
  };

  if (!mdxContent || !mdxContent.trim()) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <X />
          </EmptyMedia>
          <EmptyTitle>{t('notFound')}</EmptyTitle>
          <EmptyDescription>{t('notFoundDetails')}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Card className="mx-auto flex w-full h-full flex-col overflow-hidden border bg-background shadow-sm">
      <CardHeader className="border-b">
        <CardTitle>{scrapperResult.title}</CardTitle>
        <CardDescription className="flex flex-col gap-1">
          <a
            href={scrapperResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            {scrapperResult.url}
          </a>
          {scrapperResult.scrapedAt && (
            <p className="text-xs text-muted-foreground">
              Scraped at:{' '}
              {new Date(scrapperResult.scrapedAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          )}
          <Badge variant="outline" className="gap-1.5">
            <span
              className={cn('size-1.5 rounded-full', {
                'bg-success':
                  scrapperResult.status === 'CLASSIFIED_MANUALLY' ||
                  scrapperResult.status === 'CLASSIFIED_AUTO',
                'bg-yellow-500': scrapperResult.status === 'NEW',
                'bg-destructive':
                  scrapperResult.status === 'FAILED' ||
                  scrapperResult.status === 'REJECTED',
              })}
            />
            {t(`status.${scrapperResult.status}`)}
          </Badge>
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {/* Main Scrollable Markdown Content */}
        <ScrollArea className="max-h-[calc(100vh-420px)] h-full">
          <article className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={[rehypeRaw, rehypeSanitize]}
              components={{
                a: ({ node, ...props }) => (
                  <span className="text-muted-foreground cursor-default">
                    {props.children}
                  </span>
                ),
              }}
            >
              {mdxContent}
            </ReactMarkdown>
          </article>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex items-center justify-end gap-3 border-t">
        <Button
          variant="destructive"
          disabled={rejectMutation.isPending}
          onClick={handleReject}
        >
          <XIcon className="size-4" />
          {t('actions.reject')}
        </Button>

        <Button
          variant="success"
          disabled={classifyMutation.isPending}
          onClick={handleClassify}
        >
          <CheckIcon className="size-4" />
          {t('actions.classify')}
        </Button>
      </CardFooter>
    </Card>
  );
}
