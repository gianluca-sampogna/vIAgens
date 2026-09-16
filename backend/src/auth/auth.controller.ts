import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService, RespostaAutenticacao } from './auth.service';
import { RegistrarDto } from './dto/registrar.dto';
import { LoginDto } from './dto/login.dto';
import { SocialLoginDto } from './dto/social-login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ParDeTokens, TokensService } from './tokens.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokensService,
  ) {}

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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<ParDeTokens> {
    const { accessToken, refreshToken } = await this.tokens.rotacionar(
      dto.refreshToken,
    );
    return { accessToken, refreshToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    await this.tokens.revogar(dto.refreshToken);
  }
}
