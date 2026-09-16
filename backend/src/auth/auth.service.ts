import { ConflictException, Injectable } from '@nestjs/common';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import {
  UsuarioPublico,
  paraUsuarioPublico,
} from '../usuarios/usuario-publico';
import { HashService } from './hash.service';
import { RegistrarDto } from './dto/registrar.dto';

export type RespostaAutenticacao = {
  usuario: UsuarioPublico;
  accessToken: string;
  refreshToken: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usuarios: UsuariosRepository,
    private readonly hash: HashService,
  ) {}

  async registrar(dto: RegistrarDto): Promise<RespostaAutenticacao> {
    const email = dto.email.toLowerCase().trim();
    const existente = await this.usuarios.buscarPorEmail(email);

    if (existente) {
      throw new ConflictException('E-mail ja cadastrado');
    }

    const senhaHash = await this.hash.gerar(dto.senha);
    const usuario = await this.usuarios.criar({
      nome: dto.nome.trim(),
      email,
      senhaHash,
    });

    return {
      usuario: paraUsuarioPublico(usuario),
      accessToken: '',
      refreshToken: '',
    };
  }
}
