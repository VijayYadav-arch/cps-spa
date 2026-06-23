import '@testing-library/jest-dom';

// Ensure React act() environment is properly configured for @testing-library/react
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom does not implement scrollTo on elements or window. Layout's scroll-reset
// effect (src/components/Layout.tsx) calls mainRef.current?.scrollTo on route
// change, which otherwise throws "scrollTo is not a function" in the App routing
// tests. Provide a no-op polyfill so component effects can run under jsdom.
if (typeof Element !== 'undefined' && !Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (typeof window !== 'undefined' && typeof window.scrollTo !== 'function') {
  window.scrollTo = () => {};
}
