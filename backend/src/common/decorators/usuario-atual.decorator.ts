import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { UsuarioAutenticado } from '../../auth/jwt.strategy';

export const UsuarioAtual = createParamDecorator(
  (_dados: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const requisicao = contexto
      .switchToHttp()
      .getRequest<{ user: UsuarioAutenticado }>();
    return requisicao.user;
  },
);
