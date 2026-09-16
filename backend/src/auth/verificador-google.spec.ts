import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { VerificadorGoogle } from './verificador-google';

vi.mock('google-auth-library', () => {
  return {
    OAuth2Client: vi.fn().mockImplementation(function (this: {
      verifyIdToken: ReturnType<typeof vi.fn>;
    }) {
      this.verifyIdToken = vi.fn();
    }),
  };
});

const CLIENT_ID_FALSO = 'client-id-de-teste.apps.googleusercontent.com';

function criarConfigFalso(): ConfigService {
  return {
    get: vi.fn((chave: string) =>
      chave === 'GOOGLE_CLIENT_ID' ? CLIENT_ID_FALSO : undefined,
    ),
  } as unknown as ConfigService;
}

/**
 * Devolve a instancia falsa de OAuth2Client que o VerificadorGoogle criou
 * internamente, para configurar/inspecionar verifyIdToken.
 */
function obterInstanciaFalsa(): { verifyIdToken: ReturnType<typeof vi.fn> } {
  const ClienteMockado = vi.mocked(OAuth2Client);
  const ultimaInstancia =
    ClienteMockado.mock.instances[ClienteMockado.mock.instances.length - 1];
  return ultimaInstancia as unknown as { verifyIdToken: ReturnType<typeof vi.fn> };
}

describe('VerificadorGoogle', () => {
  beforeEach(() => {
    vi.mocked(OAuth2Client).mockClear();
  });

  it('lanca UnauthorizedException quando verifyIdToken rejeita (token invalido/assinatura ruim)', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockRejectedValue(new Error('assinatura invalida'));

    await expect(verificador.verificar('token-ruim')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lanca UnauthorizedException quando o payload nao tem sub', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        email: 'rafael@exemplo.com',
        email_verified: true,
      }),
    });

    await expect(verificador.verificar('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lanca UnauthorizedException quando o payload nao tem email', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email_verified: true,
      }),
    });

    await expect(verificador.verificar('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lanca UnauthorizedException quando email_verified e false', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email: 'rafael@exemplo.com',
        email_verified: false,
      }),
    });

    await expect(verificador.verificar('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('lanca UnauthorizedException quando email_verified e a string "true" (nao o boolean)', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email: 'rafael@exemplo.com',
        email_verified: 'true',
      }),
    });

    await expect(verificador.verificar('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('devolve o PerfilGoogle com email em minusculas para payload valido', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email: 'Rafael@Exemplo.com',
        email_verified: true,
        name: 'Rafael',
        picture: 'https://exemplo.com/foto.png',
      }),
    });

    const perfil = await verificador.verificar('token-valido');

    expect(perfil).toEqual({
      provedorContaId: 'google-123',
      email: 'rafael@exemplo.com',
      nome: 'Rafael',
      avatarUrl: 'https://exemplo.com/foto.png',
    });
  });

  it('passa audience igual ao GOOGLE_CLIENT_ID configurado para verifyIdToken', async () => {
    const verificador = new VerificadorGoogle(criarConfigFalso());
    const instancia = obterInstanciaFalsa();
    instancia.verifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-123',
        email: 'rafael@exemplo.com',
        email_verified: true,
      }),
    });

    await verificador.verificar('token-valido');

    expect(instancia.verifyIdToken).toHaveBeenCalledWith(
      expect.objectContaining({
        idToken: 'token-valido',
        audience: CLIENT_ID_FALSO,
      }),
    );
  });
});
