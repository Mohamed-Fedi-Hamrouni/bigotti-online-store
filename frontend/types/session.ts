export type AuthSession = {
    id: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: string;
    createdAt: string;
    updatedAt: string;
    isCurrent: boolean;
};

export type RevokeSessionResponse = {
    message: string;
    currentSessionRevoked: boolean;
};

export type RevokeSessionsResponse = {
    message: string;
    revokedSessions: number;
};

export type SessionScope = "admin" | "customer";
