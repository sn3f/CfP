import { Key } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from 'react-oidc-context';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const { t } = useTranslation('translation', { keyPrefix: 'auth' });
  const auth = useAuth();

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{t('loginForm.title')}</CardTitle>
          <CardDescription>{t('loginForm.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <Button
                className="w-full flex items-center justify-center gap-2"
                onClick={() => auth.signinRedirect()}
              >
                <Key className="size-4" />
                {t('loginForm.loginButton')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        {t('loginForm.terms.part1')}{' '}
        <a href="#">{t('loginForm.terms.termsOfService')}</a>{' '}
        {t('loginForm.terms.and')}{' '}
        <a href="#">{t('loginForm.terms.privacyPolicy')}</a>.
      </div>
    </div>
  );
}
