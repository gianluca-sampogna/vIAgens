import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { TokensService } from './tokens.service';

@Module({
  imports: [UsuariosModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, HashService, TokensService],
  exports: [AuthService, TokensService],
})
export class AuthModule {}
