import { cn } from '@/lib/utils';

export function Logo({ className }: React.ComponentProps<'img'>) {
  return (
    <>
      <img
        src="/dark_logo.svg"
        alt="Dark Theme Logo of ILO CFP Classifier"
        className={cn('h-12 block', className)}
      />
      {/* <img
        src="/logo.png"
        alt="Light Theme Logo of ILO CFP Classifier"
        className={cn('h-12 block dark:hidden', className)}
      /> */}
    </>
  );
}
