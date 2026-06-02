export function FullPageSpinner() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b6375',
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      Loading…
    </div>
  );
}
