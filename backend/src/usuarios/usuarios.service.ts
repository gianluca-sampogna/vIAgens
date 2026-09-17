import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DadosAtualizacaoPerfil,
  UsuariosRepository,
} from './usuarios.repository';
import { PerfilCompleto, paraPerfilCompleto } from './usuario-publico';

@Injectable()
export class UsuariosService {
  constructor(private readonly repositorio: UsuariosRepository) {}

  async buscarPerfil(id: string): Promise<PerfilCompleto> {
    const usuario = await this.repositorio.buscarPorId(id);

    if (!usuario) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const preferencias = await this.repositorio.buscarPreferencias(id);

    return paraPerfilCompleto(usuario, preferencias);
  }

  async atualizarPerfil(
    id: string,
    dados: DadosAtualizacaoPerfil,
  ): Promise<PerfilCompleto> {
    const usuario = await this.repositorio.atualizarPerfil(id, dados);
    const preferencias = await this.repositorio.buscarPreferencias(id);

    return paraPerfilCompleto(usuario, preferencias);
  }
}
