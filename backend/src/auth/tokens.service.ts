import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import { SupabaseService } from '../banco/supabase.service';

export type ParDeTokens = {
  accessToken: string;
  refreshToken: string;
};

export type PayloadAccessToken = {
  sub: string;
};

// Tipo derivado da superficie publica do @nestjs/jwt (parametro de
// signAsync), em vez de importar 'ms' diretamente. O pacote 'ms' e apenas
// dependencia transitiva de jsonwebtoken via @nestjs/jwt: nao esta
// declarado no package.json deste projeto, entao depender dele diretamente
// quebra sob hoisting diferente (ex.: pnpm) ou numa major do jsonwebtoken
// que deixe de usa-lo.
type OpcoesAssinatura = NonNullable<Parameters<JwtService['signAsync']>[1]>;
type ExpiresIn = NonNullable<OpcoesAssinatura['expiresIn']>;

const DIAS_PADRAO_REFRESH = 7;

const MILISSEGUNDOS_POR_UNIDADE: Record<'d' | 'h' | 'm', number> = {
  d: 24 * 60 * 60 * 1000,
  h: 60 * 60 * 1000,
  m: 60 * 1000,
};

const PADRAO_DURACAO = /^(\d+)(d|h|m)$/;

@Injectable()
export class TokensService {
  // Calculado uma vez na subida do servico: config invalida falha cedo,
  // no boot, em vez de estourar de forma confusa no primeiro login. Segue
  // o mesmo padrao de SupabaseService, que valida suas variaveis no
  // construtor.
  private readonly refreshExpiraEmMs: number;

  constructor(
    private readonly jwt: JwtService,
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {
    const configurado =
      this.config.get<string>('JWT_REFRESH_EXPIRES') ??
      `${DIAS_PADRAO_REFRESH}d`;
    this.refreshExpiraEmMs = TokensService.interpretarDuracao(
      configurado,
      'JWT_REFRESH_EXPIRES',
    );
  }

  // Interpreta valores no formato <numero><unidade>, com unidade d
  // (dias), h (horas) ou m (minutos). Formato nao reconhecido lanca erro
  // em vez de cair num padrao silencioso: configuracao errada deve
  // aparecer na hora, nao virar comportamento estranho meses depois.
  private static interpretarDuracao(
    valor: string,
    nomeVariavel: string,
  ): number {
    const match = PADRAO_DURACAO.exec(valor.trim());

    if (!match) {
      throw new Error(
        `${nomeVariavel} invalida: "${valor}". Formatos aceitos: ` +
          '<numero>d (dias), <numero>h (horas) ou <numero>m (minutos), ' +
          'ex.: "7d", "12h", "30m".',
      );
    }

    const quantidade = Number.parseInt(match[1], 10);
    const unidade = match[2] as 'd' | 'h' | 'm';

    return quantidade * MILISSEGUNDOS_POR_UNIDADE[unidade];
  }

  async emitirPar(usuarioId: string): Promise<ParDeTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: usuarioId } satisfies PayloadAccessToken,
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES') ??
          '15m') as ExpiresIn,
      },
    );

    // O refresh token e opaco: valor aleatorio, guardado so como hash.
    // Assim um vazamento do banco nao entrega sessao de ninguem.
    const refreshToken = randomBytes(48).toString('hex');

    const { error } = await this.supabase.cliente.from('refresh_token').insert({
      usuario_id: usuarioId,
      token_hash: this.gerarHash(refreshToken),
      expira_em: this.calcularExpiracaoRefresh().toISOString(),
    });

    if (error) {
      throw new InternalServerErrorException(
        `Falha ao registrar sessao: ${error.message}`,
      );
    }

    return { accessToken, refreshToken };
  }

  async rotacionar(
    refreshToken: string,
  ): Promise<{ usuarioId: string } & ParDeTokens> {
    const { data, error } = await this.supabase.cliente
      .from('refresh_token')
      .select('*')
      .eq('token_hash', this.gerarHash(refreshToken))
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(
        `Falha ao consultar sessao: ${error.message}`,
      );
    }

    if (
      !data ||
      data.revogado_em !== null ||
      new Date(data.expira_em) <= new Date()
    ) {
      throw new UnauthorizedException('Sessao invalida ou expirada');
    }

    const { error: erroRevogacao } = await this.supabase.cliente
      .from('refresh_token')
      .update({ revogado_em: new Date().toISOString() })
      .eq('id', data.id);

    if (erroRevogacao) {
      throw new InternalServerErrorException(
        `Falha ao revogar sessao anterior: ${erroRevogacao.message}`,
      );
    }

    const par = await this.emitirPar(data.usuario_id);
    return { usuarioId: data.usuario_id, ...par };
  }

  async revogar(refreshToken: string): Promise<void> {
    // Update que nao encontra linha nao e erro: logout e idempotente.
    // O filtro por revogado_em nulo preserva o instante da primeira revogacao.
    const { error } = await this.supabase.cliente
      .from('refresh_token')
      .update({ revogado_em: new Date().toISOString() })
      .eq('token_hash', this.gerarHash(refreshToken))
      .is('revogado_em', null);

    if (error) {
      throw new InternalServerErrorException(
        `Falha ao encerrar sessao: ${error.message}`,
      );
    }
  }

  private gerarHash(valor: string): string {
    return createHash('sha256').update(valor).digest('hex');
  }

  private calcularExpiracaoRefresh(): Date {
    return new Date(Date.now() + this.refreshExpiraEmMs);
  }
}
