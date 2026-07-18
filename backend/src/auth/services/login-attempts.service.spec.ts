import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginAttemptsService } from './login-attempts.service';

describe('LoginAttemptsService - connexion admin', () => {
  afterEach(() => jest.restoreAllMocks());

  it('bloque pendant 15 minutes après cinq échecs admin', () => {
    const service = new LoginAttemptsService();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.recordFailure('admin', 'Admin@Bigotti.tn', '192.0.2.1');
    }

    try {
      service.assertCanAttempt('admin', 'admin@bigotti.tn', '192.0.2.1');
      throw new Error('La tentative aurait dû être bloquée.');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  });

  it('réinitialise le compteur après une connexion réussie', () => {
    const service = new LoginAttemptsService();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      service.recordFailure('admin', 'admin@bigotti.tn', '192.0.2.1');
    }
    service.reset('admin', 'admin@bigotti.tn', '192.0.2.1');

    expect(() =>
      service.assertCanAttempt('admin', 'admin@bigotti.tn', '192.0.2.1'),
    ).not.toThrow();
  });
});
