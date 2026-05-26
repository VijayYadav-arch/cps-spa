/**
 * Thrown by claims.ts when a JWT payload is missing required claims or
 * cannot be base64-decoded. Treated as an auth failure; AuthContext
 * clears state and redirects to /login?reason=invalid_token.
 */
export class MalformedTokenError extends Error {
  constructor(message: string = 'Token claims could not be parsed') {
    super(message);
    this.name = 'MalformedTokenError';
  }
}

/**
 * Thrown by DevLoginForm submit validation when a field is invalid.
 * Captured field name so the form can render the error next to the
 * offending input.
 */
export class DevClaimsValidationError extends Error {
  constructor(public readonly field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'DevClaimsValidationError';
  }
}
