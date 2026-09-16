import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { UsuariosRepository } from '../usuarios/usuarios.repository';
import { HashService } from './hash.service';
import { TokensService } from './tokens.service';
import { VerificadorGoogle } from './verificador-google';
import { Usuario } from '../usuarios/usuario';

const usuarioFalso: Usuario = {
  id: 'id-1',
  nome: 'Rafael',
  email: 'rafael@exemplo.com',
  senhaHash: null,
  avatarUrl: null,
  papel: 'USUARIO',
  criadoEm: new Date('2026-01-01'),
  atualizadoEm: new Date('2026-01-01'),
};

describe('AuthService.loginSocial', () => {
  let usuarios: UsuariosRepository;
  let tokens: TokensService;
  let verificador: VerificadorGoogle;
  let service: AuthService;

  beforeEach(() => {
    usuarios = {
      buscarPorEmail: vi.fn(),
      buscarPorId: vi.fn(),
      criar: vi.fn(),
      atualizarPerfil: vi.fn(),
      vincularOuCriarPorGoogle: vi.fn(),
    } as unknown as UsuariosRepository;

    tokens = {
      emitirPar: vi
        .fn()
        .mockResolvedValue({ accessToken: 'acesso', refreshToken: 'refresh' }),
    } as unknown as TokensService;

    verificador = { verificar: vi.fn() } as unknown as VerificadorGoogle;

    service = new AuthService(
      usuarios,
      {} as HashService,
      tokens,
      verificador,
    );
  });

  it('delega ao repositorio a vinculacao ou criacao e emite tokens', async () => {
    vi.mocked(verificador.verificar).mockResolvedValue({
      provedorContaId: 'google-123',
      email: 'rafael@exemplo.com',
      nome: 'Rafael',
      avatarUrl: null,
    });
    vi.mocked(usuarios.vincularOuCriarPorGoogle).mockResolvedValue(usuarioFalso);

    const resposta = await service.loginSocial('id-token');

    expect(usuarios.vincularOuCriarPorGoogle).toHaveBeenCalledWith({
      provedorContaId: 'google-123',
      email: 'rafael@exemplo.com',
      nome: 'Rafael',
      avatarUrl: null,
    });
    expect(tokens.emitirPar).toHaveBeenCalledWith('id-1');
    expect(resposta.accessToken).toBe('acesso');
    expect(resposta.usuario).not.toHaveProperty('senhaHash');
  });

  it('propaga a falha do verificador sem tocar no banco', async () => {
    vi.mocked(verificador.verificar).mockRejectedValue(
      new Error('token invalido'),
    );

    await expect(service.loginSocial('ruim')).rejects.toThrow();
    expect(usuarios.vincularOuCriarPorGoogle).not.toHaveBeenCalled();
  });
});
