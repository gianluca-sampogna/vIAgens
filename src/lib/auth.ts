import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { api } from "@/services/api";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    // 1. Executado no momento em que o usuário faz login com o Google
    async signIn({ user, account, profile }) {
      try {
        console.log("Usuário autenticado pelo Google:", user);

        // TODO: Enviar dados de cadastro / login para o seu backend usando Axios
        // const response = await api.post("/auth/social-login", {
        //   email: user.email,
        //   name: user.name,
        //   avatar: user.image,
        //   googleId: account?.providerAccountId,
        // });

        // if (response.status === 200 || response.status === 201) {
        //   return true;
        // }

        return true;
      } catch (error) {
        console.error("Erro ao autenticar usuário com o backend:", error);
        return false;
      }
    },

    // 2. Preenche o JWT com informações adicionais
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        // Exemplo: se o seu backend devolver um token de acesso:
        // token.backendToken = user.backendToken;
      }
      return token;
    },

    // 3. Deixa essas informações disponíveis na sessão da aplicação
    async session({ session, token }) {
      if (session.user) {
        // session.user.id = token.id as string;
        // session.backendToken = token.backendToken as string;
      }
      return session;
    },
  },
};
