import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { api } from "@/services/api";

type UsuarioDoBackend = {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  papel: string;
  criadoEm: string;
};

type RespostaAutenticacao = {
  usuario: UsuarioDoBackend;
  accessToken: string;
  refreshToken: string;
};

type ParDeTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Le o `exp` de dentro do access token para saber quando renovar.
 *
 * Nao verificamos a assinatura aqui de proposito: quem valida o token e o
 * backend, a cada requisicao. Este valor serve so para agendar a renovacao —
 * se estiver errado, o pior que acontece e uma renovacao a mais ou um 401 que
 * dispara a renovacao na chamada seguinte.
 */
function expiracaoDoToken(accessToken: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(accessToken.split(".")[1], "base64").toString(),
    ) as { exp?: number };

    return typeof payload.exp === "number" ? payload.exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** Renova o par de tokens no backend. Nunca lanca: devolve o token com erro. */
async function renovarSessao(
  refreshToken: string | undefined,
): Promise<Partial<import("next-auth/jwt").JWT>> {
  if (!refreshToken) {
    return { erro: "SemRefreshToken" };
  }

  try {
    const { data } = await api.post<ParDeTokens>("/auth/refresh", {
      refreshToken,
    });

    return {
      backendToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiraEm: expiracaoDoToken(data.accessToken),
      erro: undefined,
    };
  } catch (erro) {
    console.error("Falha ao renovar sessao no backend:", erro);
    return { erro: "FalhaAoRenovarSessao" };
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),

    CredentialsProvider({
      id: "senha",
      name: "E-mail e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          return null;
        }

        try {
          const { data } = await api.post<RespostaAutenticacao>("/auth/login", {
            email: credentials.email,
            senha: credentials.senha,
          });

          return {
            id: data.usuario.id,
            name: data.usuario.nome,
            email: data.usuario.email,
            image: data.usuario.avatarUrl,
            backendToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch {
          // Devolver null produz a mesma resposta para senha errada e e-mail
          // inexistente, igual ao backend faz. Nao distinguimos aqui o que o
          // backend se recusou a distinguir la.
          return null;
        }
      },
    }),

    /**
     * Cadastro como provider, e nao como uma chamada solta seguida de login.
     *
     * O /auth/registrar ja devolve um par de tokens. Se o front chamasse ele
     * direto e depois fizesse signIn, o primeiro par ficaria orfao: ninguem o
     * guardaria, ninguem o revogaria, e ele valeria por 7 dias. Passando por
     * aqui, o par que o cadastro emite e exatamente o que vira a sessao.
     */
    CredentialsProvider({
      id: "cadastro",
      name: "Criar conta",
      credentials: {
        nome: { label: "Nome", type: "text" },
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.nome || !credentials?.email || !credentials?.senha) {
          return null;
        }

        try {
          const { data } = await api.post<RespostaAutenticacao>(
            "/auth/registrar",
            {
              nome: credentials.nome,
              email: credentials.email,
              senha: credentials.senha,
            },
          );

          return {
            id: data.usuario.id,
            name: data.usuario.nome,
            email: data.usuario.email,
            image: data.usuario.avatarUrl,
            backendToken: data.accessToken,
            refreshToken: data.refreshToken,
          };
        } catch (falha) {
          const status =
            typeof falha === "object" && falha !== null && "response" in falha
              ? (falha as { response?: { status?: number } }).response?.status
              : undefined;

          // O erro lancado aqui chega ao formulario em `resultado.error`,
          // que e como distinguimos "e-mail ja existe" de "senha curta".
          if (status === 409) {
            throw new Error("EMAIL_JA_CADASTRADO");
          }

          if (status === 400) {
            throw new Error("DADOS_INVALIDOS");
          }

          throw new Error("FALHA_NO_CADASTRO");
        }
      },
    }),
  ],

  secret: process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/login",
  },

  callbacks: {
    async jwt({ token, account, user }) {
      // 1. Primeiro login pelo Google. O backend verifica a assinatura do
      //    id_token com o proprio Google e devolve o nosso par de tokens.
      if (account?.id_token) {
        try {
          const { data } = await api.post<RespostaAutenticacao>(
            "/auth/social-login",
            { idToken: account.id_token },
          );

          return {
            ...token,
            id: data.usuario.id,
            backendToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiraEm: expiracaoDoToken(data.accessToken),
            erro: undefined,
          };
        } catch (erro) {
          console.error("Falha ao autenticar no backend:", erro);
          return { ...token, erro: "FalhaNoLoginSocial" };
        }
      }

      // 2. Primeiro login por e-mail e senha. O authorize acima ja trouxe os
      //    tokens; aqui so passamos para dentro do JWT da sessao.
      if (user?.backendToken) {
        return {
          ...token,
          id: user.id,
          backendToken: user.backendToken,
          refreshToken: user.refreshToken,
          expiraEm: expiracaoDoToken(user.backendToken),
          erro: undefined,
        };
      }

      // 3. Sessao ainda valida. Renovamos um minuto antes de expirar, para
      //    nao correr o risco de uma requisicao sair com token ja vencido.
      if (token.expiraEm && Date.now() < token.expiraEm - 60_000) {
        return token;
      }

      // 4. Access token vencendo. Sem esta etapa a sessao morreria em 15
      //    minutos com o usuario ainda aparentando estar logado.
      return { ...token, ...(await renovarSessao(token.refreshToken)) };
    },

    async session({ session, token }) {
      session.backendToken = token.backendToken;
      session.erro = token.erro;

      if (session.user) {
        session.user.id = token.id;
      }

      return session;
    },
  },

  events: {
    /**
     * Sair da aplicacao precisa revogar o refresh token no backend, senao ele
     * continua valendo por 7 dias depois do logout.
     *
     * O access token ainda vale ate expirar (no maximo 15 minutos): ele e
     * autocontido e nao consultamos uma lista de revogados a cada requisicao.
     */
    async signOut({ token }) {
      if (!token?.refreshToken) {
        return;
      }

      try {
        await api.post("/auth/logout", { refreshToken: token.refreshToken });
      } catch (erro) {
        console.error("Falha ao revogar sessao no backend:", erro);
      }
    },
  },
};
