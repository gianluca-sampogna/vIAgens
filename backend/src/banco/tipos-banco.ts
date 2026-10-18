/**
 * Tipos do banco, derivados do schema real do projeto Supabase
 * `mglopitnyzobhiavosmw`.
 *
 * O bloco `Database` e gerado, nao escrito a mao. Para regerar depois de uma
 * migration nova, use a ferramenta `generate_typescript_types` do MCP do
 * Supabase (ou `npx supabase gen types typescript --project-id
 * mglopitnyzobhiavosmw`) e substitua o bloco.
 *
 * Os apelidos no final sao nossos, nao gerados: a versao gerada traz genericos
 * elaborados para suportar varios schemas, e nos usamos so o `public`.
 *
 * Convencao: o banco usa snake_case; a camada de repositorio converte para
 * camelCase, que e o que o resto do backend enxerga.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      conta_social: {
        Row: {
          criado_em: string;
          id: string;
          provedor: Database['public']['Enums']['provedor_social'];
          provedor_conta_id: string;
          usuario_id: string;
        };
        Insert: {
          criado_em?: string;
          id?: string;
          provedor: Database['public']['Enums']['provedor_social'];
          provedor_conta_id: string;
          usuario_id: string;
        };
        Update: {
          criado_em?: string;
          id?: string;
          provedor?: Database['public']['Enums']['provedor_social'];
          provedor_conta_id?: string;
          usuario_id?: string;
        };
        Relationships: [];
      };
      preferencias_gerais: {
        Row: {
          clima_preferido: string | null;
          estilo_viagem_padrao: string | null;
          interesses_padrao: string[];
          orcamento_referencia: number | null;
          usuario_id: string;
        };
        Insert: {
          clima_preferido?: string | null;
          estilo_viagem_padrao?: string | null;
          interesses_padrao?: string[];
          orcamento_referencia?: number | null;
          usuario_id: string;
        };
        Update: {
          clima_preferido?: string | null;
          estilo_viagem_padrao?: string | null;
          interesses_padrao?: string[];
          orcamento_referencia?: number | null;
          usuario_id?: string;
        };
        Relationships: [];
      };
      refresh_token: {
        Row: {
          criado_em: string;
          expira_em: string;
          id: string;
          revogado_em: string | null;
          token_hash: string;
          usuario_id: string;
        };
        Insert: {
          criado_em?: string;
          expira_em: string;
          id?: string;
          revogado_em?: string | null;
          token_hash: string;
          usuario_id: string;
        };
        Update: {
          criado_em?: string;
          expira_em?: string;
          id?: string;
          revogado_em?: string | null;
          token_hash?: string;
          usuario_id?: string;
        };
        Relationships: [];
      };
      usuario: {
        Row: {
          atualizado_em: string;
          avatar_url: string | null;
          criado_em: string;
          email: string;
          id: string;
          nome: string;
          papel: Database['public']['Enums']['papel'];
          senha_hash: string | null;
        };
        Insert: {
          atualizado_em?: string;
          avatar_url?: string | null;
          criado_em?: string;
          email: string;
          id?: string;
          nome: string;
          papel?: Database['public']['Enums']['papel'];
          senha_hash?: string | null;
        };
        Update: {
          atualizado_em?: string;
          avatar_url?: string | null;
          criado_em?: string;
          email?: string;
          id?: string;
          nome?: string;
          papel?: Database['public']['Enums']['papel'];
          senha_hash?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      vincular_ou_criar_por_google: {
        Args: {
          p_avatar_url: string | null;
          p_email: string;
          p_nome: string;
          p_provedor_conta_id: string;
        };
        Returns: Database['public']['Tables']['usuario']['Row'];
      };
    };
    Enums: {
      papel: 'USUARIO' | 'ADMINISTRADOR';
      provedor_social: 'GOOGLE';
    };
    CompositeTypes: Record<never, never>;
  };
};

/** Linha crua da tabela `usuario`, em snake_case. */
export type LinhaUsuario = Database['public']['Tables']['usuario']['Row'];

/** Linha crua da tabela `preferencias_gerais`, em snake_case. */
export type LinhaPreferencias =
  Database['public']['Tables']['preferencias_gerais']['Row'];

/** Linha crua da tabela `refresh_token`, em snake_case. */
export type LinhaRefreshToken =
  Database['public']['Tables']['refresh_token']['Row'];

/** Linha crua da tabela `conta_social`, em snake_case. */
export type LinhaContaSocial =
  Database['public']['Tables']['conta_social']['Row'];

export type Papel = Database['public']['Enums']['papel'];
export type ProvedorSocial = Database['public']['Enums']['provedor_social'];

/**
 * Valores do enum `papel` em forma de objeto, para usar como `Papel.ADMINISTRADOR`
 * no lugar da string solta. Substitui o enum que vinha do `@prisma/client`.
 */
export const Papel = {
  USUARIO: 'USUARIO',
  ADMINISTRADOR: 'ADMINISTRADOR',
} as const satisfies Record<string, Papel>;

export const ProvedorSocial = {
  GOOGLE: 'GOOGLE',
} as const satisfies Record<string, ProvedorSocial>;
