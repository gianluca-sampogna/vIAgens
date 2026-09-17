import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { UsuariosRepository } from './usuarios.repository';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [PassportModule],
  controllers: [UsuariosController],
  providers: [UsuariosRepository, UsuariosService],
  exports: [UsuariosRepository, UsuariosService],
})
export class UsuariosModule {}
