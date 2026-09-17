import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Papel } from '../banco/tipos-banco';
import { UsuariosRepository } from '../usuarios/usuarios.repository';

export type UsuarioAutenticado = {
  id: string;
  papel: Papel;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usuarios: UsuariosRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') ?? '',
    });
  }

  /**
   * Consulta o banco a cada requisicao de proposito: um usuario banido
   * (RF16) precisa perder acesso antes do access token expirar.
   */
  async validate(payload: { sub: string }): Promise<UsuarioAutenticado> {
    const usuario = await this.usuarios.buscarPorId(payload.sub);

    if (!usuario) {
      throw new UnauthorizedException('Sessao invalida');
    }

    return { id: usuario.id, papel: usuario.papel };
  }
}
