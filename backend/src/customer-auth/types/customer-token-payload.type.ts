export type CustomerTokenPayload = {
  sub: string;
  email: string;
  sessionId: string;
  tokenType: 'customer';
  iat?: number;
  exp?: number;
};

export type LegacyCustomerTokenPayload = {
  sub: string;
  email: string;
  type: 'CUSTOMER';
  iat?: number;
  exp?: number;
};

export type AnyCustomerTokenPayload =
  CustomerTokenPayload | LegacyCustomerTokenPayload;
