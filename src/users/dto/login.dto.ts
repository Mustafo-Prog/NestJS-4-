import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class Login {
  @IsString()
  @MaxLength(16)
  @MinLength(3)
  @IsNotEmpty()
  nickname: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  @IsNotEmpty()
  password: string;
}
