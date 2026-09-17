import { describe, it, expect, vi } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TokensService } from './tokens.service';
import { SupabaseService } from '../banco/supabase.service';

type Resposta = { data: unknown; error: unknown };

/**
 * O cliente do Supabase encadeia (.from().select().eq().maybeSingle()) e cada
 * elo tanto continua a cadeia quanto pode ser aguardado. Este falso devolve um
 * objeto que e encadeavel E thenable, o que cobre as duas formas com uma
 * implementacao so.
 */
function criarElo(resposta: Resposta): Record<string, unknown> {
  const promessa = Promise.resolve(resposta);
  return {
    eq: vi.fn(() => criarElo(resposta)),
    is: vi.fn(() => criarElo(resposta)),
    select: vi.fn(() => criarElo(resposta)),
    maybeSingle: vi.fn(() => Promise.resolve(resposta)),
    single: vi.fn(() => Promise.resolve(resposta)),
    then: promessa.then.bind(promessa),
  };
}

function criarSupabaseFalso(resposta: Resposta = { data: null, error: null }) {
  const insert = vi.fn(() => criarElo(resposta));
  const select = vi.fn(() => criarElo(resposta));
  const update = vi.fn(() => criarElo(resposta));
  const from = vi.fn(() => ({ insert, select, update }));

  const service = { cliente: { from } } as unknown as SupabaseService;
  return { service, espioes: { from, insert, select, update } };
}

function criarConfigFalso(): ConfigService {
  const valores: Record<string, string> = {
    JWT_SECRET: 'segredo-de-teste',
    JWT_ACCESS_EXPIRES: '15m',
    JWT_REFRESH_EXPIRES: '7d',
  };
  return { get: (chave: string) => valores[chave] } as unknown as ConfigService;
}

describe('TokensService', () => {
  describe('emitirPar', () => {
    it('devolve access token com o id do usuario no sub', async () => {
      const { service: supabase } = criarSupabaseFalso();
      const service = new TokensService(
        new JwtService({ secret: 'segredo-de-teste' }),
        supabase,
        criarConfigFalso(),
      );

      const par = await service.emitirPar('id-1');

      const payload = JSON.parse(
        Buffer.from(par.accessToken.split('.')[1], 'base64').toString(),
      );
      expect(payload.sub).toBe('id-1');
    });

    it('persiste o refresh token como hash, nunca em texto puro', async () => {
      const { service: supabase, espioes } = criarSupabaseFalso();
      const service = new TokensService(
        new JwtService({ secret: 'segredo-de-teste' }),
        supabase,
        criarConfigFalso(),
      );

      const par = await service.emitirPar('id-1');

      expect(espioes.from).toHaveBeenCalledWith('refresh_token');
      const gravado = espioes.insert.mock.calls[0][0] as {
        usuario_id: string;
        token_hash: string;
      };
      expect(gravado.usuario_id).toBe('id-1');
      expect(gravado.token_hash).not.toBe(par.refreshToken);
      expect(gravado.token_hash).toHaveLength(64);
    });
  });

  describe('rotacionar', () => {
    function montar(resposta: Resposta) {
      const { service: supabase, espioes } = criarSupabaseFalso(resposta);
      const service = new TokensService(
        new JwtService({ secret: 'segredo-de-teste' }),
        supabase,
        criarConfigFalso(),
      );
      return { service, espioes };
    }

    it('recusa token que nao existe no banco', async () => {
      const { service } = montar({ data: null, error: null });

      await expect(service.rotacionar('token-falso')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('recusa token ja revogado', async () => {
      const { service } = montar({
        data: {
          id: 'rt-1',
          usuario_id: 'id-1',
          expira_em: new Date(Date.now() + 100000).toISOString(),
          revogado_em: new Date().toISOString(),
        },
        error: null,
      });

      await expect(service.rotacionar('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('recusa token expirado', async () => {
      const { service } = montar({
        data: {
          id: 'rt-1',
          usuario_id: 'id-1',
          expira_em: new Date(Date.now() - 1000).toISOString(),
          revogado_em: null,
        },
        error: null,
      });

      await expect(service.rotacionar('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('revoga o token antigo ao emitir o novo par', async () => {
      const { service, espioes } = montar({
        data: {
          id: 'rt-1',
          usuario_id: 'id-1',
          expira_em: new Date(Date.now() + 100000).toISOString(),
          revogado_em: null,
        },
        error: null,
      });

      const resultado = await service.rotacionar('token');

      expect(espioes.update).toHaveBeenCalledWith(
        expect.objectContaining({ revogado_em: expect.any(String) }),
      );
      expect(resultado.usuarioId).toBe('id-1');
      expect(resultado.accessToken).toEqual(expect.any(String));
      expect(resultado.refreshToken).not.toBe('token');
    });
  });

  describe('revogar', () => {
    function montar(resposta: Resposta) {
      const { service: supabase, espioes } = criarSupabaseFalso(resposta);
      const service = new TokensService(
        new JwtService({ secret: 'segredo-de-teste' }),
        supabase,
        criarConfigFalso(),
      );
      return { service, espioes };
    }

    it('filtra por revogado_em nulo, para nao sobrescrever a primeira revogacao', async () => {
      const { service, espioes } = montar({ data: null, error: null });

      await service.revogar('token');

      expect(espioes.update).toHaveBeenCalledWith(
        expect.objectContaining({ revogado_em: expect.any(String) }),
      );
      // A cadeia real e update().eq().is(): cada elo encadeado devolve um
      // novo objeto, entao percorremos os mock.results para achar o elo
      // que de fato recebeu a chamada a is('revogado_em', null).
      const eloAposUpdate = espioes.update.mock.results[0].value as {
        eq: ReturnType<typeof vi.fn>;
      };
      const eloAposEq = eloAposUpdate.eq.mock.results[0].value as {
        is: ReturnType<typeof vi.fn>;
      };
      expect(eloAposEq.is).toHaveBeenCalledWith('revogado_em', null);
    });

    it('nao lanca quando nenhuma linha e encontrada (logout idempotente)', async () => {
      const { service } = montar({ data: null, error: null });

      await expect(service.revogar('token-inexistente')).resolves.toBeUndefined();
    });

    it('lanca quando o PostgREST devolve erro', async () => {
      const { service } = montar({
        data: null,
        error: { message: 'falha de conexao' },
      });

      await expect(service.revogar('token')).rejects.toThrow(
        'Falha ao encerrar sessao: falha de conexao',
      );
    });
  });
});
