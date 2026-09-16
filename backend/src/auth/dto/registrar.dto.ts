import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegistrarDto {
  @IsString()
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres' })
  @MaxLength(120)
  nome!: string;

  @IsEmail({}, { message: 'E-mail invalido' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres' })
  @MaxLength(72)
  senha!: string;
}
