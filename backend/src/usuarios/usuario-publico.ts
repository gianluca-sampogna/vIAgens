import { Papel } from '../banco/tipos-banco';
import { Usuario } from './usuario';
import { Preferencias } from './preferencias';

export type UsuarioPublico = {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  papel: Papel;
  criadoEm: Date;
};

/**
 * Converte o usuario na forma que sai pela API.
 * senhaHash nunca atravessa esta funcao.
 */
export function paraUsuarioPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    avatarUrl: usuario.avatarUrl,
    papel: usuario.papel,
    criadoEm: usuario.criadoEm,
  };
}

/**
 * Forma devolvida por GET e PATCH /usuarios/eu. Nao e usada nas respostas
 * de /auth/*: login e cadastro nao precisam pagar a consulta extra a
 * preferencias_gerais.
 */
export type PerfilCompleto = UsuarioPublico & { preferencias: Preferencias };

export function paraPerfilCompleto(
  usuario: Usuario,
  preferencias: Preferencias,
): PerfilCompleto {
  return { ...paraUsuarioPublico(usuario), preferencias };
}
