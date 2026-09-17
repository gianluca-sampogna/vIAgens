import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import {
  UsuarioPublico,
  paraUsuarioPublico,
} from '../usuarios/usuario-publico';
import { HashService } from './hash.service';
import { TokensService } from './tokens.service';
import { VerificadorGoogle } from './verificador-google';
import { RegistrarDto } from './dto/registrar.dto';
import { LoginDto } from './dto/login.dto';

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
    private readonly tokens: TokensService,
    private readonly google: VerificadorGoogle,
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

    const par = await this.tokens.emitirPar(usuario.id);

    return {
      usuario: paraUsuarioPublico(usuario),
      ...par,
    };
  }

  async login(dto: LoginDto): Promise<RespostaAutenticacao> {
    const email = dto.email.toLowerCase().trim();
    const usuario = await this.usuarios.buscarPorEmail(email);

    // Usuario inexistente, conta so com login social (sem senhaHash) e senha
    // errada caem todos na mesma resposta, para nao revelar quais e-mails
    // tem cadastro.
    const senhaConfere =
      usuario?.senhaHash != null &&
      (await this.hash.verificar(usuario.senhaHash, dto.senha));

    if (!usuario || !senhaConfere) {
      throw new UnauthorizedException('E-mail ou senha invalidos');
    }

    const par = await this.tokens.emitirPar(usuario.id);

    return { usuario: paraUsuarioPublico(usuario), ...par };
  }

  async loginSocial(idToken: string): Promise<RespostaAutenticacao> {
    const perfil = await this.google.verificar(idToken);
    const usuario = await this.usuarios.vincularOuCriarPorGoogle(perfil);
    const par = await this.tokens.emitirPar(usuario.id);

    return { usuario: paraUsuarioPublico(usuario), ...par };
  }
}
