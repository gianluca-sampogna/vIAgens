import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Papel } from '../../banco/tipos-banco';
import { CHAVE_PAPEIS } from '../decorators/papeis.decorator';
import { UsuarioAutenticado } from '../../auth/jwt.strategy';

/**
 * Atende o RNF10. Usar sempre depois do JwtAuthGuard:
 *   @UseGuards(JwtAuthGuard, PapeisGuard)
 *   @Papeis(Papel.ADMINISTRADOR)
 */
@Injectable()
export class PapeisGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Papel[] | undefined>(
      CHAVE_PAPEIS,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (!exigidos || exigidos.length === 0) {
      return true;
    }

    const requisicao = contexto
      .switchToHttp()
      .getRequest<{ user?: UsuarioAutenticado }>();

    if (!requisicao.user || !exigidos.includes(requisicao.user.papel)) {
      throw new ForbiddenException('Acesso restrito a administradores');
    }

    return true;
  }
}
