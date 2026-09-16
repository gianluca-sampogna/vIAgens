import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsuarioAtual } from '../common/decorators/usuario-atual.decorator';
import { UsuarioAutenticado } from '../auth/jwt.strategy';
import { UsuariosService } from './usuarios.service';
import { PerfilCompleto } from './usuario-publico';
import { AtualizarPerfilDto } from './dto/atualizar-perfil.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard)
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get('eu')
  buscarPerfil(
    @UsuarioAtual() usuario: UsuarioAutenticado,
  ): Promise<PerfilCompleto> {
    return this.usuarios.buscarPerfil(usuario.id);
  }

  @Patch('eu')
  atualizarPerfil(
    @UsuarioAtual() usuario: UsuarioAutenticado,
    @Body() dto: AtualizarPerfilDto,
  ): Promise<PerfilCompleto> {
    return this.usuarios.atualizarPerfil(usuario.id, dto);
  }
}
