"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { api, comToken } from "@/services/api";
import styles from "./styles.module.css";

type Preferencias = {
  orcamentoReferencia: number | null;
  interessesPadrao: string[];
  estiloViagemPadrao: string | null;
  climaPreferido: string | null;
};

type Perfil = {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  papel: string;
  criadoEm: string;
  preferencias: Preferencias;
};

export default function Dashboard() {
  const { data: sessao, status } = useSession();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !sessao?.backendToken) {
      return;
    }

    let cancelado = false;

    api
      .get<Perfil>("/usuarios/eu", comToken(sessao.backendToken))
      .then(({ data }) => {
        if (!cancelado) setPerfil(data);
      })
      .catch(() => {
        if (!cancelado) {
          setErro("Não foi possível carregar seu perfil. O backend está no ar?");
        }
      });

    return () => {
      cancelado = true;
    };
  }, [status, sessao?.backendToken]);

  if (status === "loading") {
    return <div className={styles.container}>Carregando...</div>;
  }

  // A sessao existe mas o backend nao renovou o token: o usuario precisa
  // entrar de novo. Sem esta checagem ele veria um erro generico.
  if (sessao?.erro) {
    return (
      <div className={styles.container}>
        <p className={styles.erro}>
          Sua sessão expirou. Saia e entre novamente.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.conteudo}>
        <h1 className={styles.titulo}>
          Olá, {perfil?.nome ?? sessao?.user?.name ?? "viajante"}
        </h1>
        <p className={styles.subtitulo}>
          Seu painel ainda não tem roteiros — a geração por IA é a próxima
          entrega.
        </p>

        {erro && <p className={styles.erro}>{erro}</p>}

        {perfil && (
          <div className={styles.cartao}>
            <h2 className={styles.tituloCartao}>
              Dados vindos do backend
              <span className={styles.selo}>GET /usuarios/eu</span>
            </h2>

            <dl className={styles.lista}>
              <div className={styles.linha}>
                <dt>E-mail</dt>
                <dd>{perfil.email}</dd>
              </div>
              <div className={styles.linha}>
                <dt>Papel</dt>
                <dd>{perfil.papel}</dd>
              </div>
              <div className={styles.linha}>
                <dt>Conta criada em</dt>
                <dd>
                  {new Date(perfil.criadoEm).toLocaleDateString("pt-BR")}
                </dd>
              </div>
              <div className={styles.linha}>
                <dt>Orçamento de referência</dt>
                <dd>
                  {perfil.preferencias.orcamentoReferencia === null
                    ? "não definido"
                    : perfil.preferencias.orcamentoReferencia.toLocaleString(
                        "pt-BR",
                        { style: "currency", currency: "BRL" },
                      )}
                </dd>
              </div>
              <div className={styles.linha}>
                <dt>Interesses</dt>
                <dd>
                  {perfil.preferencias.interessesPadrao.length > 0
                    ? perfil.preferencias.interessesPadrao.join(", ")
                    : "nenhum ainda"}
                </dd>
              </div>
              <div className={styles.linha}>
                <dt>Clima preferido</dt>
                <dd>{perfil.preferencias.climaPreferido ?? "não definido"}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
