import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <h1 data-testid="unauthorized-page" className="mb-2 text-2xl font-semibold">
        Access denied
      </h1>
      <p className="mb-6 max-w-[480px] text-slate-500">
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
      <Link to="/" className="font-medium text-teal-700 hover:underline">
        Return to dashboard
      </Link>
    </div>
  );
}
