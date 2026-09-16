import { Injectable, UnauthorizedException } from '@nestjs/common';
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
  private readonly cliente: OAuth2Client;
  private readonly clientId: string;

  constructor(config: ConfigService) {
    this.clientId = config.get<string>('GOOGLE_CLIENT_ID') ?? '';
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
    } catch {
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
