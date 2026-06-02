import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 16px',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>Access denied</h1>
      <p style={{ color: '#64748b', maxWidth: 480, marginBottom: 24 }}>
        You don't have permission to access this page. Contact your administrator if you believe this is an error.
      </p>
      <Link to="/" style={{ color: '#2563eb', textDecoration: 'underline' }}>
        Return to dashboard
      </Link>
    </div>
  );
}
