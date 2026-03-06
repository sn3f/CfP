import { Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PRESET_QUESTIONS } from '@/features/proposals/lib/constants';

type ChatQuestionsPresetProps = {
  setInput: (value: string) => void;
  status: 'streaming' | 'ready' | 'submitted' | 'error';
  compact?: boolean;
};

export function ChatQuestionsPreset({
  setInput,
  status,
  compact = false,
}: ChatQuestionsPresetProps) {
  const { t } = useTranslation('translation', {
    keyPrefix: 'workspace.cfp.chat',
  });

  const isLoading = status === 'streaming' || status === 'submitted';
  const isError = status === 'error';

  const handlePresetClick = (question: string) => {
    if (isLoading) return;
    setInput(question);
  };

  return (
    <div
      className={`flex flex-col ${compact ? 'items-start' : 'items-center text-center'} w-full`}
    >
      {!compact && (
        <>
          <div
            className="border rounded-full p-3 bg-primary shrink-0"
            aria-hidden="true"
          >
            <Bot className="size-6 text-primary-foreground" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground text-sm leading-4 tracking-tight">
            {t('description')}
          </p>
        </>
      )}

      <Tabs
        defaultValue={PRESET_QUESTIONS[0].key}
        className={`items-center w-full ${compact ? '' : 'mt-4'}`}
      >
        <TabsList className={`gap-1 bg-transparent ${compact ? 'mb-2' : ''}`}>
          {PRESET_QUESTIONS.map((preset) => (
            <TabsTrigger
              key={preset.key}
              value={preset.key}
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full data-[state=active]:shadow-none"
            >
              {t(preset.groupKey)}
            </TabsTrigger>
          ))}
        </TabsList>
        {PRESET_QUESTIONS.map((preset) => (
          <TabsContent value={preset.key} key={preset.key} className="w-full">
            <div className="flex flex-col gap-1 w-full">
              {preset.questionKeys.map((qKey) => (
                <button
                  key={qKey}
                  className="w-full text-pretty text-sm font-normal px-4 py-1.5 rounded-full border hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground"
                  onClick={() => handlePresetClick(t(qKey))}
                  disabled={isLoading || isError}
                >
                  {t(qKey)}
                </button>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
