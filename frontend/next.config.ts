import path from "node:path";
import type { NextConfig } from "next";
import { loadEnvConfig } from "@next/env";

// O .env e unico e fica na RAIZ do monorepo, compartilhado com o backend.
// O Next.js so le .env de dentro da propria pasta, entao apontamos para a raiz.
//
// O quarto argumento (forceReload) e obrigatorio, e nao opcional: o Next ja
// chamou loadEnvConfig para esta pasta antes de carregar este arquivo, e a
// funcao devolve o resultado em cache nas chamadas seguintes SEM ler o
// diretorio novo. Sem o forceReload, esta linha vira um no-op silencioso e o
// NextAuth cai em "NO_SECRET".
loadEnvConfig(
  path.resolve(process.cwd(), ".."),
  process.env.NODE_ENV !== "production",
  console,
  true,
);

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
