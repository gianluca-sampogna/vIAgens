import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'node:crypto';
import type { StringValue } from 'ms';
import { SupabaseService } from '../banco/supabase.service';

export type ParDeTokens = {
  accessToken: string;
  refreshToken: string;
};

export type PayloadAccessToken = {
  sub: string;
};

const DIAS_PADRAO_REFRESH = 7;

@Injectable()
export class TokensService {
  constructor(
    private readonly jwt: JwtService,
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async emitirPar(usuarioId: string): Promise<ParDeTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: usuarioId } satisfies PayloadAccessToken,
      {
        secret: this.config.get<string>('JWT_SECRET'),
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES') ??
          '15m') as StringValue,
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
    const configurado =
      this.config.get<string>('JWT_REFRESH_EXPIRES') ??
      `${DIAS_PADRAO_REFRESH}d`;
    const dias = Number.parseInt(configurado.replace('d', ''), 10);
    const diasValidos = Number.isNaN(dias) ? DIAS_PADRAO_REFRESH : dias;

    return new Date(Date.now() + diasValidos * 24 * 60 * 60 * 1000);
  }
}
