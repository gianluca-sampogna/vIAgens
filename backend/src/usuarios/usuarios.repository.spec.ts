import { describe, it, expect } from 'vitest';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { UsuariosRepository } from './usuarios.repository';
import { SupabaseService } from '../banco/supabase.service';

/**
 * O cliente do Supabase encadeia metodos (.from().select().eq().maybeSingle())
 * e cada elo pode ser o fim da cadeia (ex.: insert() sem select() depois).
 * Este elo falso serve para qualquer combinacao: cada metodo devolve o
 * proprio elo, e o elo tambem e "thenable", resolvendo sempre para a
 * resposta configurada quando alguem faz `await` nele.
 */
function criarEloEncadeavel(resposta: { data: unknown; error: unknown }) {
  const elo: Record<string, unknown> = {
    from: () => elo,
    select: () => elo,
    eq: () => elo,
    insert: () => elo,
    update: () => elo,
    upsert: () => elo,
    maybeSingle: () => Promise.resolve(resposta),
    single: () => Promise.resolve(resposta),
    then: (
      resolve: (valor: typeof resposta) => unknown,
      rejeitar: (erro: unknown) => unknown,
    ) => Promise.resolve(resposta).then(resolve, rejeitar),
  };

  return elo;
}

function criarSupabaseFalso(resposta: {
  data: unknown;
  error: unknown;
}): SupabaseService {
  return {
    cliente: criarEloEncadeavel(resposta),
  } as unknown as SupabaseService;
}

describe('UsuariosRepository', () => {
  describe('buscarPorId', () => {
    it('transforma erro do PostgREST em excecao, em vez de devolver null', async () => {
      const supabase = criarSupabaseFalso({
        data: null,
        error: { code: 'XX000', message: 'falha de conexao' },
      });
      const repositorio = new UsuariosRepository(supabase);

      await expect(repositorio.buscarPorId('id-1')).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });

    it('devolve null quando nao ha linha e nao ha erro', async () => {
      const supabase = criarSupabaseFalso({ data: null, error: null });
      const repositorio = new UsuariosRepository(supabase);

      const resultado = await repositorio.buscarPorId('id-inexistente');

      expect(resultado).toBeNull();
    });
  });

  describe('atualizarPerfil', () => {
    it('lanca NotFoundException quando o id nao existe, em vez de TypeError', async () => {
      // Update afeta zero linhas: PostgREST devolve data null e sem erro
      // quando a consulta usa .maybeSingle() (ou PGRST116 com .single()).
      const supabase = criarSupabaseFalso({ data: null, error: null });
      const repositorio = new UsuariosRepository(supabase);

      await expect(
        repositorio.atualizarPerfil('id-inexistente', { nome: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
