import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PostgrestError } from '@supabase/supabase-js';
import { SupabaseService } from '../banco/supabase.service';
import { Usuario, paraUsuario } from './usuario';

export type DadosCriacaoUsuario = {
  nome: string;
  email: string;
  senhaHash?: string | null;
  avatarUrl?: string | null;
};

export type DadosPreferencias = {
  orcamentoReferencia?: number | null;
  interessesPadrao?: string[];
  estiloViagemPadrao?: string | null;
  climaPreferido?: string | null;
};

export type DadosAtualizacaoPerfil = {
  nome?: string;
  preferencias?: DadosPreferencias;
};

@Injectable()
export class UsuariosRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async buscarPorEmail(email: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    this.lancarSeErro(error, 'buscar usuario por e-mail');
    return data ? paraUsuario(data) : null;
  }

  async buscarPorId(id: string): Promise<Usuario | null> {
    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    this.lancarSeErro(error, 'buscar usuario por id');
    return data ? paraUsuario(data) : null;
  }

  /**
   * Cria o usuario e o registro de preferencias vazio. Nao ha transacao aqui:
   * o PostgREST nao a oferece. Se a segunda insercao falhar, o usuario fica
   * sem preferencias — por isso atualizarPerfil usa upsert, que se recupera
   * desse estado em vez de quebrar.
   */
  async criar(dados: DadosCriacaoUsuario): Promise<Usuario> {
    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .insert({
        nome: dados.nome,
        email: dados.email,
        senha_hash: dados.senhaHash ?? null,
        avatar_url: dados.avatarUrl ?? null,
      })
      .select('*')
      .maybeSingle();

    this.lancarSeErro(error, 'criar usuario');

    if (!data) {
      throw new InternalServerErrorException(
        'Falha ao criar usuario: nenhuma linha retornada',
      );
    }

    const { error: erroPreferencias } = await this.supabase.cliente
      .from('preferencias_gerais')
      .insert({ usuario_id: data.id });

    this.lancarSeErro(erroPreferencias, 'criar preferencias do usuario');

    return paraUsuario(data);
  }

  async atualizarPerfil(
    id: string,
    dados: DadosAtualizacaoPerfil,
  ): Promise<Usuario> {
    if (dados.preferencias) {
      const p = dados.preferencias;
      const { error } = await this.supabase.cliente
        .from('preferencias_gerais')
        .upsert(
          {
            usuario_id: id,
            ...(p.orcamentoReferencia !== undefined
              ? { orcamento_referencia: p.orcamentoReferencia }
              : {}),
            ...(p.interessesPadrao !== undefined
              ? { interesses_padrao: p.interessesPadrao }
              : {}),
            ...(p.estiloViagemPadrao !== undefined
              ? { estilo_viagem_padrao: p.estiloViagemPadrao }
              : {}),
            ...(p.climaPreferido !== undefined
              ? { clima_preferido: p.climaPreferido }
              : {}),
          },
          { onConflict: 'usuario_id' },
        );

      this.lancarSeErro(error, 'atualizar preferencias');
    }

    // Sem nome para mudar, nao ha update na tabela usuario: so releitura.
    if (dados.nome === undefined) {
      const usuario = await this.buscarPorId(id);

      if (!usuario) {
        throw new InternalServerErrorException(
          'Usuario desapareceu durante a atualizacao',
        );
      }

      return usuario;
    }

    const { data, error } = await this.supabase.cliente
      .from('usuario')
      .update({ nome: dados.nome })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    this.lancarSeErro(error, 'atualizar usuario');

    if (!data) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    return paraUsuario(data);
  }

  /**
   * Erro do PostgREST nao vira excecao sozinho: ele volta no campo `error`.
   * Ignorar isso faz falha de banco passar como "nenhum resultado".
   */
  private lancarSeErro(erro: PostgrestError | null, acao: string): void {
    if (!erro) {
      return;
    }

    throw new InternalServerErrorException(
      `Falha ao ${acao}: ${erro.message}`,
    );
  }
}
