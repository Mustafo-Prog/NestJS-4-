import { Test } from '@nestjs/testing';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

vi.hoisted(() => {
  process.env.JWT_SECRET_CODE = 'e2e-only-signing-key';
});

describe('Users API with JWT', () => {
  let app: INestApplication<App>;
  let jwt: JwtService;
  let users: User[] = [];
  const credentials = { nickname: 'alice', password: 'password123' };
  const publicUser = (user: User) => ({
    id: user.id,
    nickname: user.nickname,
    age: user.age,
  });
  const prisma = {
    user: {
      findUnique: vi.fn(
        async ({
          where,
          select,
        }: {
          where: { id?: number; nickname?: string };
          select?: unknown;
        }) => {
          const user = users.find((item) =>
            where.id !== undefined
              ? item.id === where.id
              : item.nickname === where.nickname,
          );
          return user ? (select ? publicUser(user) : user) : null;
        },
      ),
      findMany: vi.fn(async () => users.map(publicUser)),
      create: vi.fn(async ({ data }: { data: Omit<User, 'id'> }) => {
        const user = { id: users.length + 1, ...data };
        users.push(user);
        return user;
      }),
      update: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: number };
          data: Omit<User, 'id'>;
        }) => {
          const user = users.find((item) => item.id === where.id)!;
          Object.assign(user, data);
          return user;
        },
      ),
      delete: vi.fn(async ({ where }: { where: { id: number } }) => {
        const user = users.find((item) => item.id === where.id);
        users = users.filter((item) => item.id !== where.id);
        return user;
      }),
    },
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    jwt = app.get(JwtService);
  });

  beforeEach(() => {
    users = [];
  });

  afterAll(async () => {
    await app?.close();
  });

  async function registerAndLogin() {
    await request(app.getHttpServer())
      .post('/users/register')
      .send(credentials)
      .expect(201);

    return request(app.getHttpServer())
      .post('/users/login')
      .send(credentials)
      .expect(201);
  }

  it('keeps the root endpoint public', async () => {
    await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('registers, logs in and reads the profile using the returned token', async () => {
    const login = await registerAndLogin();
    const payload = await jwt.verifyAsync(login.body.access_token);

    expect(payload).toMatchObject({ sub: 1, nickname: credentials.nickname });
    expect(payload.exp - payload.iat).toBe(3600);
    expect(login.body).toMatchObject({
      token_type: 'Bearer',
      expires_in: 3600,
    });
    expect(JSON.stringify(login.body)).not.toContain(users[0].password);

    const profile = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(profile.body).toEqual({ id: 1, nickname: 'alice', age: 0 });

    const list = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(200);

    expect(list.body).toEqual([profile.body]);
    expect(list.body[0]).not.toHaveProperty('password');
  });

  it.each([
    ['get', '/users'],
    ['get', '/users/me'],
    ['get', '/users/1'],
    ['put', '/users/1'],
    ['delete', '/users/1'],
  ] as const)('requires a token for %s %s', async (method, path) => {
    await request(app.getHttpServer())[method](path).expect(401);
  });

  it('rejects invalid login credentials', async () => {
    await registerAndLogin();

    for (const body of [
      { ...credentials, password: 'wrong-password' },
      { ...credentials, nickname: 'missing' },
    ]) {
      await request(app.getHttpServer())
        .post('/users/login')
        .send(body)
        .expect(401);
    }
  });

  it('rejects forged and expired tokens', async () => {
    const payload = { sub: 1, nickname: 'alice' };
    const expired = await jwt.signAsync(payload, { expiresIn: -1 });
    const forged = await jwt.signAsync(payload, {
      secret: 'wrong-e2e-test-key',
    });

    for (const token of [expired, forged, 'invalid.token.value']) {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    }
  });

  it('prevents changing or deleting another account', async () => {
    const login = await registerAndLogin();

    await request(app.getHttpServer())
      .post('/users/register')
      .send({ nickname: 'bob', age: 25, password: 'password456' })
      .expect(201);

    await request(app.getHttpServer())
      .put('/users/2')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .send({ ...credentials, age: 99 })
      .expect(403);

    await request(app.getHttpServer())
      .delete('/users/2')
      .set('Authorization', `Bearer ${login.body.access_token}`)
      .expect(403);

    expect(users[1]).toMatchObject({ nickname: 'bob', age: 25 });
  });

  it('updates and deletes the current account', async () => {
    const login = await registerAndLogin();
    const authorization = `Bearer ${login.body.access_token}`;
    const updated = {
      nickname: 'new-alice',
      age: 21,
      password: 'new-password',
    };

    await request(app.getHttpServer())
      .put('/users/1')
      .set('Authorization', authorization)
      .send(updated)
      .expect(200);

    await request(app.getHttpServer())
      .post('/users/login')
      .send({ nickname: updated.nickname, password: updated.password })
      .expect(201);

    await request(app.getHttpServer())
      .delete('/users/1')
      .set('Authorization', authorization)
      .expect(200);

    await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', authorization)
      .expect(404);
  });

  it('validates registration input', async () => {
    for (const body of [
      { ...credentials, age: -1 },
      { ...credentials, age: 1.5 },
      { ...credentials, role: 'admin' },
    ]) {
      await request(app.getHttpServer())
        .post('/users/register')
        .send(body)
        .expect(400);
    }

    expect(users).toHaveLength(0);
  });
});
