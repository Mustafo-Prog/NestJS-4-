import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';

describe('UsersController', () => {
  const service = {
    getOne: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  const controller = new UsersController(service as unknown as UsersService);
  const request = { user: { sub: 1 } } as AuthenticatedRequest;
  const body = { nickname: 'alice', age: 20, password: 'password123' };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('uses the authenticated user for the profile', async () => {
    await controller.getProfile(request);
    expect(service.getOne).toHaveBeenCalledWith(1);
  });

  it('allows updating the current account', async () => {
    await controller.update(1, body, request);
    expect(service.update).toHaveBeenCalledWith(1, body);
  });

  it('blocks updates to another account', () => {
    expect(() => controller.update(2, body, request)).toThrow(
      ForbiddenException,
    );
    expect(service.update).not.toHaveBeenCalled();
  });

  it('blocks deleting another account', () => {
    expect(() => controller.delete(2, request)).toThrow(ForbiddenException);
    expect(service.delete).not.toHaveBeenCalled();
  });
});
