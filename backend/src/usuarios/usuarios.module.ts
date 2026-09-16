import { Module } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { UsuariosService } from './usuarios.service';

@Module({
  providers: [UsuariosRepository, UsuariosService],
  exports: [UsuariosRepository, UsuariosService],
})
export class UsuariosModule {}
