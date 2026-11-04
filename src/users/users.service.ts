import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { Register } from './dto/register.dto.js';
import { Login } from './dto/login.dto.js';

const publicUserFields = { id: true, nickname: true, age: true } as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async getAll() {
    return this.prisma.user.findMany({
      orderBy: { id: 'asc' },
      select: publicUserFields,
    });
  }

  async getOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserFields,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async register(body: Register) {
    const { nickname, age = 0, password } = body;
    const user = await this.prisma.user.findUnique({ where: { nickname } });

    if (user) {
      throw new BadRequestException('This nickname is already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.create({
      data: { nickname, age, password: hashedPassword },
    });

    return { message: 'You have successfully registered in our platform🔥!' };
  }

  async login(body: Login) {
    const user = await this.prisma.user.findUnique({
      where: { nickname: body.nickname },
    });

    if (!user || !(await bcrypt.compare(body.password, user.password))) {
      throw new UnauthorizedException('Nickname or password is incorrect');
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      nickname: user.nickname,
    });

    return {
      Message: 'Login successful. Below is information about you.',
      Account: {
        Id: `${user.id}`,
        Nickname: user.nickname,
        Age: `${user.age}`,
      },
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
    };
  }

  async update(id: number, body: Register) {
    const currentUser = await this.getOne(id);
    const { nickname, age = 0, password } = body;

    if (nickname !== currentUser.nickname) {
      const user = await this.prisma.user.findUnique({ where: { nickname } });

      if (user) {
        throw new BadRequestException('This nickname is already taken');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: { id },
      data: { nickname, age, password: hashedPassword },
    });

    return { message: 'User has been successfully updated!' };
  }

  async delete(id: number) {
    await this.getOne(id);
    await this.prisma.user.delete({ where: { id } });

    return { message: 'User has been successfully deleted!' };
  }
}
