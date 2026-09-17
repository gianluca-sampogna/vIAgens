import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type PerfilGoogle = {
  provedorContaId: string;
  email: string;
  nome: string;
  avatarUrl: string | null;
};

@Injectable()
export class VerificadorGoogle {
  private readonly logger = new Logger(VerificadorGoogle.name);
  private readonly cliente: OAuth2Client;
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('GOOGLE_CLIENT_ID') ?? '';

    // Escolha deliberada e temporaria: o client id ainda nao foi fornecido
    // pelo integrante do frontend. Falhar na subida aqui travaria o backend
    // inteiro por uma dependencia externa que nao depende deste servico.
    // audience: '' rejeita todo token, entao o comportamento e seguro
    // (fecha, nao abre) mas fica silencioso sem este aviso. Quando o client
    // id estiver configurado, considere trocar isto por falha na subida.
    if (!this.clientId) {
      this.logger.warn(
        'GOOGLE_CLIENT_ID nao configurado: login social com Google esta ' +
          'inoperante. Defina a variavel de ambiente GOOGLE_CLIENT_ID.',
      );
    }

    this.cliente = new OAuth2Client(this.clientId);
  }

  async verificar(idToken: string): Promise<PerfilGoogle> {
    let payload;

    try {
      // verifyIdToken checa assinatura, emissor, expiracao e audience.
      const ticket = await this.cliente.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch (erro) {
      // Nunca logar o idToken: e credencial, e log e lido por mais gente
      // e costuma ir para sistemas externos. So o tipo/mensagem do erro.
      this.logger.warn(
        `Falha ao verificar token do Google: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
      throw new UnauthorizedException('Token do Google invalido');
    }

    if (!payload?.sub || !payload.email) {
      throw new UnauthorizedException('Token do Google incompleto');
    }

    // Sem esta checagem a vinculacao automatica por e-mail viraria sequestro
    // de conta: bastaria um provedor devolver um e-mail alheio nao verificado.
    if (payload.email_verified !== true) {
      throw new UnauthorizedException('E-mail do Google nao verificado');
    }

    return {
      provedorContaId: payload.sub,
      email: payload.email.toLowerCase(),
      nome: payload.name ?? payload.email,
      avatarUrl: payload.picture ?? null,
    };
  }
}
