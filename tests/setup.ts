import '@testing-library/jest-dom';

// Ensure React act() environment is properly configured for @testing-library/react
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
