import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Register } from './dto/register.dto.js';
import * as bcrypt from "bcrypt"
import { Login } from './dto/login.dto.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}
  async getAll(): Promise<any[]> {
    return this.prisma.user.findMany({
        orderBy: {
            id: "asc"
        }
    });
  }
  async getOne(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }
  async register(body: Register) {
    let {nickname, age, password} = body
    const user = await this.prisma.user.findUnique({
        where: {nickname: nickname}
    })
    if(user){
        throw new BadRequestException("This nickname has been already taken by someone else...");
    }
    const hashedPassword = await bcrypt.hash(
        body.password,
        10
    )
    await this.prisma.user.create({
      data: {
        nickname: body.nickname,
        age: body.age,
        password: hashedPassword
      }
    });
    return { message: 'You have successfully registered in our platform🔥!' };
  }
  async login(body: Login) {
    const user1 = await this.prisma.user.findUnique({ where: { nickname: body.nickname } });
    if (!user1) {
      throw new BadRequestException('User not found');
    }
    const result = await bcrypt.compare(body.password, user1.password);
    if(!result) {
      throw new BadRequestException("Nickname or password is incorrect...");
    }
    return {
      Message: 'Login successfull. Below is information about you.',
      Account: {
        Id: `${user1.id}`,
        Nickname: `${user1.nickname}`,
        Age: `${user1.age ? user1.age : "Not set"}`
      }
    };
  }
  async update(id: number, body: any) {
    const user = await this.prisma.user.findUnique({
        where: {id}
    })
    if(user){
        if(body.nickname === user.nickname){

        }else{
            throw new BadRequestException("This nickname has been already taken by someone else...");
        }
    }
    const hashedPassword = await bcrypt.hash(
        body.password,
        10
    )
    await this.prisma.user.update({ 
        where: { id },
        data: {
            nickname: body.nickname,
            age: body.age,
            password: hashedPassword
        } 
    });
    return { message: 'User has been successfully updated!' };
  }
  async delete(id: number) {
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User has been successfully deleted!' };
  }
}
