import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, RespostaAutenticacao } from './auth.service';
import { RegistrarDto } from './dto/registrar.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registrar')
  registrar(@Body() dto: RegistrarDto): Promise<RespostaAutenticacao> {
    return this.auth.registrar(dto);
  }
}
