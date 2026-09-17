"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./styles.module.css";

type Aba = "entrar" | "criar";

const MENSAGEM_CREDENCIAIS = "E-mail ou senha inválidos.";
const MENSAGEM_GENERICA = "Não foi possível concluir. Tente novamente.";

/** Códigos lançados pelo provider de cadastro em `src/lib/auth.ts`. */
const MENSAGENS_DE_ERRO: Record<string, string> = {
  EMAIL_JA_CADASTRADO: "Este e-mail já tem cadastro. Use a aba Entrar.",
  DADOS_INVALIDOS: "Confira os dados: a senha precisa de ao menos 8 caracteres.",
  FALHA_NO_CADASTRO: MENSAGEM_GENERICA,
  CredentialsSignin: MENSAGEM_CREDENCIAIS,
};

export default function Login() {
  const router = useRouter();

  const [aba, setAba] = useState<Aba>("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const criando = aba === "criar";

  function trocarAba(nova: Aba) {
    setAba(nova);
    setErro(null);
    setSenha("");
  }

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCarregando(true);

    try {
      // Cada aba tem seu provider. O de cadastro cria a conta e devolve a
      // sessao na mesma chamada, sem deixar um par de tokens orfao.
      const resultado = await signIn(criando ? "cadastro" : "senha", {
        ...(criando ? { nome } : {}),
        email,
        senha,
        redirect: false,
      });

      if (resultado?.error) {
        setErro(MENSAGENS_DE_ERRO[resultado.error] ?? MENSAGEM_GENERICA);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setErro(MENSAGEM_GENERICA);
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.cartao}>
        <div className={styles.abas} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!criando}
            className={`${styles.aba} ${!criando ? styles.abaAtiva : ""}`}
            onClick={() => trocarAba("entrar")}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={criando}
            className={`${styles.aba} ${criando ? styles.abaAtiva : ""}`}
            onClick={() => trocarAba("criar")}
          >
            Criar conta
          </button>
        </div>

        <form className={styles.formulario} onSubmit={aoEnviar}>
          {criando && (
            <label className={styles.campo}>
              <span className={styles.rotulo}>Nome</span>
              <input
                className={styles.entrada}
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                minLength={2}
                maxLength={120}
                required
                autoComplete="name"
              />
            </label>
          )}

          <label className={styles.campo}>
            <span className={styles.rotulo}>E-mail</span>
            <input
              className={styles.entrada}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label className={styles.campo}>
            <span className={styles.rotulo}>Senha</span>
            <input
              className={styles.entrada}
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={criando ? 8 : undefined}
              required
              autoComplete={criando ? "new-password" : "current-password"}
            />
            {criando && (
              <span className={styles.ajuda}>Ao menos 8 caracteres.</span>
            )}
          </label>

          {erro && (
            <p className={styles.erro} role="alert">
              {erro}
            </p>
          )}

          <button
            className={styles.botaoPrincipal}
            type="submit"
            disabled={carregando}
          >
            {carregando
              ? "Aguarde..."
              : criando
                ? "Criar conta e entrar"
                : "Entrar"}
          </button>
        </form>

        <div className={styles.separador}>
          <span>ou</span>
        </div>

        <button
          type="button"
          className={styles.botaoGoogle}
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          Continuar com Google
        </button>
      </div>
    </div>
  );
}
