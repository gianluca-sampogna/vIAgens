import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosRepository } from './usuarios.repository';
import { Usuario } from './usuario';

const usuarioFalso: Usuario = {
  id: 'id-1',
  nome: 'Rafael',
  email: 'rafael@exemplo.com',
  senhaHash: '$argon2id$hash-secreto',
  avatarUrl: null,
  papel: 'USUARIO',
  criadoEm: new Date('2026-01-01'),
  atualizadoEm: new Date('2026-01-01'),
};

const preferenciasPadraoFalsas = {
  orcamentoReferencia: null,
  interessesPadrao: [],
  estiloViagemPadrao: null,
  climaPreferido: null,
};

function criarRepositorioFalso(): UsuariosRepository {
  return {
    buscarPorEmail: vi.fn(),
    buscarPorId: vi.fn(),
    criar: vi.fn(),
    atualizarPerfil: vi.fn(),
    buscarPreferencias: vi.fn().mockResolvedValue(preferenciasPadraoFalsas),
    vincularOuCriarPorGoogle: vi.fn(),
  } as unknown as UsuariosRepository;
}

describe('UsuariosService', () => {
  let repositorio: UsuariosRepository;
  let service: UsuariosService;

  beforeEach(() => {
    repositorio = criarRepositorioFalso();
    service = new UsuariosService(repositorio);
  });

  describe('buscarPerfil', () => {
    it('devolve o usuario sem o hash da senha', async () => {
      vi.mocked(repositorio.buscarPorId).mockResolvedValue(usuarioFalso);

      const perfil = await service.buscarPerfil('id-1');

      expect(perfil).toEqual({
        id: 'id-1',
        nome: 'Rafael',
        email: 'rafael@exemplo.com',
        avatarUrl: null,
        papel: 'USUARIO',
        criadoEm: new Date('2026-01-01'),
        preferencias: preferenciasPadraoFalsas,
      });
      expect(perfil).not.toHaveProperty('senhaHash');
    });

    it('lanca NotFoundException quando o usuario nao existe', async () => {
      vi.mocked(repositorio.buscarPorId).mockResolvedValue(null);

      await expect(service.buscarPerfil('inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('atualizarPerfil', () => {
    it('repassa os dados ao repositorio e devolve o perfil publico', async () => {
      vi.mocked(repositorio.atualizarPerfil).mockResolvedValue({
        ...usuarioFalso,
        nome: 'Rafael Bassul',
      });

      const perfil = await service.atualizarPerfil('id-1', {
        nome: 'Rafael Bassul',
        preferencias: { climaPreferido: 'quente' },
      });

      expect(repositorio.atualizarPerfil).toHaveBeenCalledWith('id-1', {
        nome: 'Rafael Bassul',
        preferencias: { climaPreferido: 'quente' },
      });
      expect(perfil.nome).toBe('Rafael Bassul');
      expect(perfil).not.toHaveProperty('senhaHash');
    });
  });
});
