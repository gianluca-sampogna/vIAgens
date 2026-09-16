import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import { UsuarioAutenticado } from '../auth/jwt.strategy';
import { UsuariosService } from './usuarios.service';
import { UsuarioPublico } from './usuario-publico';

@Controller('usuarios')
@UseGuards(AuthGuard('jwt'))
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get('eu')
  buscarPerfil(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<UsuarioPublico> {
    return this.usuarios.buscarPerfil(usuario.id);
  }
}
