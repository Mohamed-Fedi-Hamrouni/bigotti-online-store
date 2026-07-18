import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

jest.mock('../../prisma/prisma.service', () => ({ PrismaService: class {} }));

import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';

function createContext(headers: Record<string, string> = {}, user?: object) {
  const request = { headers, user };

  return {
    request,
    context: {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as never,
  };
}

describe('Protection des routes administrateur', () => {
  const config = { get: jest.fn().mockReturnValue('test-secret') };
  const sessions = {
    getActiveAdminSession: jest.fn().mockResolvedValue({
      id: 'session-1',
      user: {
        id: 'user-1',
        email: 'admin@bigotti.tn',
        role: 'ADMIN',
      },
    }),
  };

  beforeEach(() => jest.clearAllMocks());

  it('refuse une requête admin sans token', async () => {
    const jwt = { verifyAsync: jest.fn() };
    const guard = new JwtAuthGuard(
      jwt as never,
      config as never,
      sessions as never,
    );
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('refuse un token CUSTOMER sur une route admin', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'customer-1',
        email: 'client@example.com',
        role: 'CUSTOMER',
        sessionId: 'customer-session',
        tokenType: 'customer',
      }),
    };
    const guard = new JwtAuthGuard(
      jwt as never,
      config as never,
      sessions as never,
    );
    const { context } = createContext({
      authorization: 'Bearer customer-token',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(sessions.getActiveAdminSession).not.toHaveBeenCalled();
  });

  it.each(['MANAGER', 'ADMIN', 'SUPER_ADMIN'] as const)(
    'accepte une session JWT admin valide avec le rôle %s',
    async (role) => {
      const jwt = {
        verifyAsync: jest.fn().mockResolvedValue({
          sub: 'user-1',
          email: 'admin@bigotti.tn',
          role,
          sessionId: 'session-1',
          tokenType: 'admin',
        }),
      };
      const roleSessions = {
        getActiveAdminSession: jest.fn().mockResolvedValue({
          id: 'session-1',
          user: {
            id: 'user-1',
            email: 'admin@bigotti.tn',
            role,
          },
        }),
      };
      const guard = new JwtAuthGuard(
        jwt as never,
        config as never,
        roleSessions as never,
      );
      const { context, request } = createContext({
        authorization: 'Bearer admin-token',
      });

      await expect(guard.canActivate(context)).resolves.toBe(true);
      expect(request.user).toEqual(expect.objectContaining({ role }));
    },
  );

  it.each(['ADMIN', 'SUPER_ADMIN'])('autorise le rôle %s', (role) => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'SUPER_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const { context } = createContext({}, { role });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('refuse un rôle non administratif même si un utilisateur est présent', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'SUPER_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const { context } = createContext({}, { role: 'CUSTOMER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('refuse MANAGER sur une fonctionnalité sensible ADMIN/SUPER_ADMIN', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN', 'SUPER_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const { context } = createContext({}, { role: 'MANAGER' });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('refuse une ancienne session après sa révocation', async () => {
    const jwt = {
      verifyAsync: jest.fn().mockResolvedValue({
        sub: 'user-1',
        email: 'admin@bigotti.tn',
        role: 'MANAGER',
        sessionId: 'revoked-session',
        tokenType: 'admin',
      }),
    };
    const revokedSessions = {
      getActiveAdminSession: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Session révoquée.')),
    };
    const guard = new JwtAuthGuard(
      jwt as never,
      config as never,
      revokedSessions as never,
    );
    const { context } = createContext({
      authorization: 'Bearer ancien-token',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
