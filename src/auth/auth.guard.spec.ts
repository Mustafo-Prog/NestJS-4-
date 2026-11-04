import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from './auth.guard.js';
import type { AuthenticatedRequest } from './auth.types.js';

const jwt = new JwtService({
  secret: 'auth-unit-test-key',
  signOptions: { expiresIn: '1h', algorithm: 'HS256' },
  verifyOptions: { algorithms: ['HS256'] },
});

function createContext(authorization?: string) {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;

  return { request, context };
}

describe('AuthGuard', () => {
  const guard = new AuthGuard(jwt);

  it('accepts a signed token and attaches its user', async () => {
    const token = await jwt.signAsync({ sub: 1, nickname: 'alice' });
    const { request, context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toMatchObject({ sub: 1, nickname: 'alice' });
  });

  it.each([undefined, '', 'Basic abc', 'Bearer', 'Bearer abc extra'])(
    'rejects an invalid authorization header: %s',
    async (header) => {
      const { context } = createContext(header);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );

  it('rejects expired tokens', async () => {
    const token = await jwt.signAsync(
      { sub: 1, nickname: 'alice' },
      { expiresIn: -1 },
    );
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token signed with another secret', async () => {
    const token = await jwt.signAsync(
      { sub: 1, nickname: 'alice' },
      { secret: 'another-unit-test-key' },
    );
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects malformed tokens', async () => {
    const { context } = createContext('Bearer invalid.token.value');

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it.each([
    { sub: '1', nickname: 'alice' },
    { sub: 0, nickname: 'alice' },
    { sub: 1 },
  ])('rejects a signed token with invalid user data', async (payload) => {
    const token = await jwt.signAsync(payload);
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a token without an expiration time', async () => {
    const token = await new JwtService({
      secret: 'auth-unit-test-key',
    }).signAsync({
      sub: 1,
      nickname: 'alice',
    });
    const { context } = createContext(`Bearer ${token}`);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
