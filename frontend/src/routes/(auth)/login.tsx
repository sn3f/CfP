import { createFileRoute, redirect } from '@tanstack/react-router';
import { format } from 'date-fns';

import { Logo } from '@/components/logo';
import { ModeToggle } from '@/components/mode-toggle';
import { LoginForm } from '@/features/auth/components/login-form';

export const Route = createFileRoute('/(auth)/login')({
  beforeLoad: ({ context }) => {
    const isAuthenticated = context.auth?.isAuthenticated ?? false;

    if (isAuthenticated) {
      throw redirect({
        to: '/proposals',
        search: (prevSearch) => ({
          ...prevSearch,
          page: prevSearch.page ?? 0,
          size: prevSearch.size ?? 10,
          eligible: prevSearch.eligible ?? 'true',
          deadline: prevSearch.deadline ?? format(new Date(), 'yyyy-MM-dd'),
        }),
      });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  return (
    <div className="flex flex-col items-center justify-center p-2 md:p-4 min-h-svh relative">
      <title> CfP Classifier - Login </title>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <Logo className="h-16 mx-auto" />

        <LoginForm />
      </div>

      <div className="absolute top-2 right-2">
        <ModeToggle />
      </div>
    </div>
  );
}
