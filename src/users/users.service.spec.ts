import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from './users.service.js';

const jwt = new JwtService({
  secret: 'users-unit-test-key',
  signOptions: { expiresIn: '1h' },
});

describe('UsersService', () => {
  const user = {
    id: 1,
    nickname: 'alice',
    age: 20,
    password: bcrypt.hashSync('password123', 4),
  };
  const prisma = {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  };
  const service = new UsersService(prisma as unknown as PrismaService, jwt);

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns a verifiable access token without the password', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    const result = await service.login({
      nickname: user.nickname,
      password: 'password123',
    });
    const payload = await jwt.verifyAsync(result.access_token);

    expect(payload).toMatchObject({ sub: user.id, nickname: user.nickname });
    expect(payload.exp - payload.iat).toBe(3600);
    expect(payload).not.toHaveProperty('password');
    expect(JSON.stringify(result)).not.toContain(user.password);
    expect(result).toMatchObject({ token_type: 'Bearer', expires_in: 3600 });
  });

  it('rejects an unknown nickname', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ nickname: 'missing', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an incorrect password', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(
      service.login({ nickname: user.nickname, password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('hashes the registration password and defaults the age to zero', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await service.register({ nickname: 'alice', password: 'password123' });

    const saved = prisma.user.create.mock.calls[0][0].data;
    expect(saved).toMatchObject({ nickname: 'alice', age: 0 });
    expect(saved.password).not.toBe('password123');
    await expect(bcrypt.compare('password123', saved.password)).resolves.toBe(
      true,
    );
  });

  it('selects only public user fields', async () => {
    await service.getAll();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      orderBy: { id: 'asc' },
      select: { id: true, nickname: true, age: true },
    });
  });

  it('allows changing to an available nickname', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce(null);

    await service.update(1, {
      nickname: 'new-alice',
      age: 21,
      password: 'new-password',
    });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nickname: 'new-alice',
        age: 21,
        password: expect.any(String),
      },
    });
  });
});
