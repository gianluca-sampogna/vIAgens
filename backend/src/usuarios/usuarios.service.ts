import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DadosAtualizacaoPerfil,
  UsuariosRepository,
} from './usuarios.repository';
import { UsuarioPublico, paraUsuarioPublico } from './usuario-publico';

@Injectable()
export class UsuariosService {
  constructor(private readonly repositorio: UsuariosRepository) {}

  async buscarPerfil(id: string): Promise<UsuarioPublico> {
    const usuario = await this.repositorio.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    return paraUsuarioPublico(usuario);
  }

  async atualizarPerfil(
    id: string,
    dados: DadosAtualizacaoPerfil,
  ): Promise<UsuarioPublico> {
    const usuario = await this.repositorio.atualizarPerfil(id, dados);
    return paraUsuarioPublico(usuario);
  }
}
