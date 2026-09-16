import { LinhaUsuario, Papel } from '../banco/tipos-banco';

/**
 * O usuario como o backend enxerga: camelCase, datas como Date.
 * O banco usa snake_case e devolve timestamp como string.
 */
export type Usuario = {
  id: string;
  nome: string;
  email: string;
  senhaHash: string | null;
  avatarUrl: string | null;
  papel: Papel;
  criadoEm: Date;
  atualizadoEm: Date;
};

export function paraUsuario(linha: LinhaUsuario): Usuario {
  return {
    id: linha.id,
    nome: linha.nome,
    email: linha.email,
    senhaHash: linha.senha_hash,
    avatarUrl: linha.avatar_url,
    papel: linha.papel,
    criadoEm: new Date(linha.criado_em),
    atualizadoEm: new Date(linha.atualizado_em),
  };
}
