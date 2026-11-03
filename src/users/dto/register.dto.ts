import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class Register{
    @IsString()
    @IsNotEmpty()
    @MinLength(3)
    @MaxLength(16)
    nickname: string
    @IsOptional()
    @IsNumber()
    @Min(0)
    @IsNotEmpty()
    age: number
    @IsString()
    @MinLength(6)
    @MaxLength(20)
    @IsNotEmpty()
    password: string
}