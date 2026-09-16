import { IsNotEmpty, IsString } from 'class-validator';

export class SocialLoginDto {
  @IsString()
  @IsNotEmpty({ message: 'idToken e obrigatorio' })
  idToken!: string;
}
