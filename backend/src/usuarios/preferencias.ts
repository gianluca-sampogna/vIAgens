import { LinhaPreferencias } from '../banco/tipos-banco';

/**
 * Preferencias gerais do usuario, em camelCase. Espelha
 * preferencias_gerais, convertida na fronteira do repositorio.
 */
export type Preferencias = {
  orcamentoReferencia: number | null;
  interessesPadrao: string[];
  estiloViagemPadrao: string | null;
  climaPreferido: string | null;
};

/**
 * Usada quando o usuario ainda nao tem linha em preferencias_gerais (ex.:
 * a segunda insercao de UsuariosRepository.criar falhou e ninguem tentou
 * de novo). Devolver isto em vez de lancar excecao evita que um GET
 * /usuarios/eu quebre por causa de um estado que atualizarPerfil corrige
 * sozinho na proxima escrita (ele usa upsert).
 */
export const PREFERENCIAS_PADRAO: Preferencias = {
  orcamentoReferencia: null,
  interessesPadrao: [],
  estiloViagemPadrao: null,
  climaPreferido: null,
};

/**
 * numeric(12,2) do Postgres pode voltar do PostgREST como string
 * ("3500.50") em vez de number, dependendo do driver/versao. Convertemos
 * aqui, na fronteira do repositorio, para que o resto do backend nunca
 * precise se preocupar com isso.
 */
export function paraPreferencias(linha: LinhaPreferencias): Preferencias {
  return {
    orcamentoReferencia:
      linha.orcamento_referencia === null
        ? null
        : Number(linha.orcamento_referencia),
    interessesPadrao: linha.interesses_padrao,
    estiloViagemPadrao: linha.estilo_viagem_padrao,
    climaPreferido: linha.clima_preferido,
  };
}
