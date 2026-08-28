import axios from "axios";
import { unstable_cache } from "next/cache";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export type DynamicParams = Record<string, unknown>;

// Tipagem das opções de cache aceitas pelo Next.js
export interface CacheOptions {
  /** Tempo em segundos para revalidação do cache (ou false para desativar) */
  revalidate?: number | false;
  /** Tags identificadoras para invalidar o cache via revalidateTag('minha-tag') */
  tags?: string[];
}

export const recuperar = async <T>(
  url: string,
  params?: DynamicParams,
  cacheOptions?: CacheOptions
): Promise<T> => {
  // Se não houver opções de cache ou revalidate === 0, faz chamada direta
  if (!cacheOptions || cacheOptions.revalidate === 0) {
    const resposta = await api.get<T>(url, { params });
    return resposta.data;
  }
  const getCachedData = unstable_cache(
    async () => {
      const resposta = await api.get<T>(url, { params });
      return resposta.data;
    },
    [url, JSON.stringify(params ?? {})],
    cacheOptions
  );
  return await getCachedData();
};

/**
 * POST - Cria/envia novos dados na API (sempre sem cache por ser escrita).
 */
export const criar = async <T, D = unknown>(
  url: string,
  body?: D,
  params?: DynamicParams
): Promise<T> => {
  const resposta = await api.post<T>(url, body, { params });
  return resposta.data;
};

/**
 * PUT - Atualiza um recurso por completo na API (sempre sem cache por ser escrita).
 */
export const editar = async <T, D = unknown>(
  url: string,
  body?: D,
  params?: DynamicParams
): Promise<T> => {
  const resposta = await api.put<T>(url, body, { params });
  return resposta.data;
};

/**
 * PATCH - Atualiza parcialmente um recurso na API (sempre sem cache por ser escrita).
 */
export const alterar = async <T, D = unknown>(
  url: string,
  body?: D,
  params?: DynamicParams
): Promise<T> => {
  const resposta = await api.patch<T>(url, body, { params });
  return resposta.data;
};

/**
 * DELETE - Remove um recurso na API (sempre sem cache por ser escrita).
 */
export const excluir = async <T>(
  url: string,
  params?: DynamicParams
): Promise<T> => {
  const resposta = await api.delete<T>(url, { params });
  return resposta.data;
};

