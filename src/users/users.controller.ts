import { Body, Controller, Delete, Get, Param, Patch, Post, Put } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { Register } from './dto/register.dto.js';
import { Login } from './dto/login.dto.js';

@Controller('users')
export class UsersController {
    constructor(private service: UsersService){}
    @Get()
    getAll(){
        return this.service.getAll();
    }
    @Get(':id')
    getOne(@Param('id') id: string){
        return this.service.getOne(+id);
    }
    @Post('/register')
    register(@Body() body: Register){
        return this.service.register(body); 
    }
    @Post('/login')
    login(@Body() body: Login){
        return this.service.login(body);
    }
    @Put(':id')
    update(@Param('id') id: string, @Body() body: any) {
        return this.service.update(+id, body);
    }
    @Delete(':id')
    delete(@Param('id') id: string){
        return this.service.delete(+id)
    }
}
