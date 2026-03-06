import { ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SUPPORTED_LANGUAGES } from '@/integrations/i18n';
import { cn } from '@/lib/utils';

export function LanguagePicker({ className }: { className?: string }) {
  const { i18n } = useTranslation();

  const currentLanguage = i18n.languages[0] || i18n.language;
  const supportedLanguages = i18n.options.supportedLngs || ['en'];
  const onlySupportedLanguages = supportedLanguages.filter((lang) =>
    SUPPORTED_LANGUAGES.some((l) => l.code === lang),
  );

  const currentLanguageName =
    SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLanguage)?.name ||
    currentLanguage;

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  useEffect(() => {
    const handler = (lang: string) => {
      document.documentElement.lang = lang;
    };
    i18n.on('languageChanged', handler);
    return () => {
      i18n.off('languageChanged', handler);
    };
  }, [i18n]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label="Change language"
          variant="outline"
          size="sm"
          className={cn(className)}
        >
          <span className="text-sm font-light">{currentLanguageName}</span>
          <ChevronDown
            className="-me-1 ms-2 opacity-60"
            size={16}
            strokeWidth={2}
            aria-hidden="true"
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup
          value={currentLanguage}
          onValueChange={handleLanguageChange}
        >
          {onlySupportedLanguages.map((lang) => {
            const label =
              SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.name || lang;
            return (
              <DropdownMenuRadioItem key={lang} value={lang}>
                {label}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
