import { useChat } from '@ai-sdk/react';
import { useEffect, useState } from 'react';

import { DefaultChatTransport } from 'ai';
import { ChevronDown, ChevronUp, MessageSquareWarning } from 'lucide-react';
import { useTranslation } from "react-i18next";
import type { CfpAnalysis } from '@/lib/types';
import type { PromptInputMessage } from '@/features/proposals/components/ai-elements/prompt-input';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea
} from '@/features/proposals/components/ai-elements/prompt-input';
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/features/proposals/components/ai-elements/conversation';
import { Loader } from '@/features/proposals/components/ai-elements/loader';
import {
  Message,
  MessageContent, MessageResponse,
} from '@/features/proposals/components/ai-elements/message';
import { ChatQuestionsPreset } from '@/features/proposals/components/chat-questions-preset';
import { cn } from '@/lib/utils';
import { getOidcAccessToken } from "@/integrations/axios.tsx";
import { Reasoning, ReasoningContent, ReasoningTrigger } from "@/features/proposals/components/ai-elements/reasoning.tsx";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';

export type ChatTabProps = React.ComponentProps<'div'> & {
  cfp: CfpAnalysis;
};

export function ChatTab({ className, cfp }: ChatTabProps) {
  const [input, setInput] = useState('');
  const [isPresetsOpen, setIsPresetsOpen] = useState(true);

  const { t } = useTranslation('translation', {
    keyPrefix: 'workspace.cfp.chat',
  });

  const { messages, sendMessage, status, error } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
  });

  const model = import.meta.env.VITE_CHATBOT_MODEL ?? 'z-ai/glm-4.5-air:free';

  useEffect(() => {
    if (messages.length > 0 && isPresetsOpen) {
      setIsPresetsOpen(false);
    }
  }, [messages.length]);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text?.trim()) return;

    const token = getOidcAccessToken();
    if (!token) {
      console.error('No OIDC token found. Aborting chat message.');
      return;
    }

    setInput('');

    const promptContext = cfp.analysisJob?.scrapResult?.promptContext ?? '';
    const estimatedTokens = promptContext.length / 4;

    const contextToSend = estimatedTokens > 100000
      ? { ...cfp, analysisJob: undefined }
      : cfp;

    sendMessage(
      {
        text: message.text,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: {
          cfpContext: JSON.stringify(contextToSend),
          model,
        },
      },
    );
  };

  return (
    <div
      className={cn(
        'flex flex-col h-full border rounded-lg bg-card overflow-hidden',
        className,
      )}
    >
      {messages.length > 0 && (
        <div className="shrink-0">
          <Collapsible open={isPresetsOpen} onOpenChange={setIsPresetsOpen}>
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between px-4 py-2 h-auto hover:bg-accent/50"
                >
                  <span className="text-sm font-medium">{t('exampleQuestions')}</span>
                  {isPresetsOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="border-b bg-muted/30">
              <div className="p-4">
                <ChatQuestionsPreset setInput={setInput} status={status} compact />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}

      <div className="relative flex flex-1 min-h-0 flex-col divide-y overflow-hidden">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 ? (
              <ConversationEmptyState>
                <ChatQuestionsPreset setInput={setInput} status={status} />
              </ConversationEmptyState>
            ) : (
              messages.map((message) => (
                <div key={message.id}>
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <Message key={`${message.id}-${i}`} from={message.role}>
                            <MessageContent>
                              <MessageResponse>
                                {part.text}
                              </MessageResponse>
                            </MessageContent>
                          </Message>
                        );
                      case 'reasoning':
                        return (
                          <Reasoning
                            key={`${message.id}-${i}`}
                            className="w-full"
                            isStreaming={status === 'streaming' && i === message.parts.length - 1 && message.id === messages.at(-1)?.id}
                          >
                            <ReasoningTrigger />
                            <ReasoningContent>{part.text}</ReasoningContent>
                          </Reasoning>
                        );
                      default:
                        return null;
                    }
                  })}
                </div>
              ))
            )}
            {status === 'submitted' && (
              <div className="flex justify-center py-4">
                <Loader />
              </div>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>

        {error && (
          <div
            className="text-destructive mt-2 bg-destructive/10 border flex flex-row justify-start items-center gap-2 border-destructive/20 p-2 rounded-md font-light text-sm max-w-xl mx-auto">
            <MessageSquareWarning className="size-4" aria-hidden="true" />
            <span>
              {error instanceof Error
                ? error.message
                : 'An unknown error occurred. Please try again.'}
            </span>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 bg-card border-t z-10">
        <PromptInput
          onSubmit={handleSubmit}
          className="w-full mx-auto max-w-2xl"
        >
          <PromptInputBody>
            <PromptInputTextarea
              className="min-h-0"
              placeholder={t('placeholder')}
              onChange={(e) => setInput(e.target.value)}
              value={input}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputSubmit
              variant="default"
              className="ml-auto text-primary-foreground"
              disabled={!input.trim() || !status}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}