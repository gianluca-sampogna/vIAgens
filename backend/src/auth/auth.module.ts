import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HashService } from './hash.service';
import { TokensService } from './tokens.service';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [UsuariosModule, JwtModule.register({}), PassportModule],
  controllers: [AuthController],
  providers: [AuthService, HashService, TokensService, JwtStrategy],
  exports: [AuthService, TokensService],
})
export class AuthModule {}
