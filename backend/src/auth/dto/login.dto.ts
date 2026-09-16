import { IsEmail, IsString, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'E-mail invalido' })
  email!: string;

  @IsString()
  @MaxLength(72)
  senha!: string;
}
