import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import type { AuthenticatedRequest } from '../auth/auth.types.js';
import { UsersService } from './users.service.js';
import { Register } from './dto/register.dto.js';
import { Login } from './dto/login.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  getAll() {
    return this.service.getAll();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.service.getOne(request.user.sub);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Post('register')
  register(@Body() body: Register) {
    return this.service.register(body);
  }

  @Post('login')
  login(@Body() body: Login) {
    return this.service.login(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: Register,
    @Req() request: AuthenticatedRequest,
  ) {
    this.checkOwner(id, request.user.sub);
    return this.service.update(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: AuthenticatedRequest,
  ) {
    this.checkOwner(id, request.user.sub);
    return this.service.delete(id);
  }

  private checkOwner(id: number, userId: number) {
    if (id !== userId) {
      throw new ForbiddenException('You can only change your own account');
    }
  }
}
