import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, RespostaAutenticacao } from './auth.service';
import { RegistrarDto } from './dto/registrar.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registrar')
  registrar(@Body() dto: RegistrarDto): Promise<RespostaAutenticacao> {
    return this.auth.registrar(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<RespostaAutenticacao> {
    return this.auth.login(dto);
  }

  @Post('social-login')
  @HttpCode(HttpStatus.OK)
  loginSocial(@Body() dto: SocialLoginDto): Promise<RespostaAutenticacao> {
    return this.auth.loginSocial(dto.idToken);
  }
}
