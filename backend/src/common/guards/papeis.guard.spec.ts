import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PapeisGuard } from './papeis.guard';
import { Papel } from '../../banco/tipos-banco';
import { UsuarioAutenticado } from '../../auth/jwt.strategy';

function criarContexto(user?: UsuarioAutenticado): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

function criarReflectorFalso(retorno: Papel[] | undefined): Reflector {
  return {
    getAllAndOverride: vi.fn(() => retorno),
  } as unknown as Reflector;
}

describe('PapeisGuard', () => {
  it('libera a rota quando nao ha @Papeis() declarado', () => {
    const guard = new PapeisGuard(criarReflectorFalso(undefined));

    expect(guard.canActivate(criarContexto())).toBe(true);
  });

  it('libera a rota quando o usuario tem o papel exigido', () => {
    const guard = new PapeisGuard(criarReflectorFalso([Papel.ADMINISTRADOR]));
    const contexto = criarContexto({ id: 'usuario-1', papel: Papel.ADMINISTRADOR });

    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('barra o usuario com papel diferente do exigido', () => {
    const guard = new PapeisGuard(criarReflectorFalso([Papel.ADMINISTRADOR]));
    const contexto = criarContexto({ id: 'usuario-1', papel: Papel.USUARIO });

    expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
  });

  it('barra a requisicao sem usuario autenticado no request', () => {
    const guard = new PapeisGuard(criarReflectorFalso([Papel.ADMINISTRADOR]));
    const contexto = criarContexto(undefined);

    expect(() => guard.canActivate(contexto)).toThrow(ForbiddenException);
  });
});
