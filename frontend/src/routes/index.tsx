import { Navigate, createFileRoute } from '@tanstack/react-router';
import { format } from 'date-fns';

export const Route = createFileRoute('/')({
  component: HomePage,
});

/**
 * @name HomePage
 *
 * @description
 * This is the home page component. It is displayed when the user navigates to the root URL.
 * For now, we're redirecting users to the main page. In the future, we can display a landing page here.
 */
function HomePage() {
  return (
    <Navigate
      to="/proposals"
      search={(prev) => ({
        ...prev,
        page: prev.page ?? 0,
        size: prev.size ?? 10,
        eligible: prev.eligible ?? 'true',
        deadline: prev.deadline ?? format(new Date(), 'yyyy-MM-dd'),
      })}
    />
  );
}
