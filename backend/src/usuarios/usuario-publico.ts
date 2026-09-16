import { Papel } from '../banco/tipos-banco';
import { Usuario } from './usuario';

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
