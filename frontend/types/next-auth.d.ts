import "next-auth";
import "next-auth/jwt";

/**
 * O NextAuth nao sabe do nosso backend. Estas declaracoes acrescentam os
 * campos que guardamos na sessao e no token: o JWT emitido pelo backend
 * (`backendToken`), o refresh token opaco, e o id do usuario no nosso banco
 * — que nao e o mesmo id que o Google usa.
 */
declare module "next-auth" {
  interface Session {
    /** JWT do backend, enviado no header Authorization das chamadas a API. */
    backendToken?: string;
    /** Preenchido quando a sessao nao pode mais ser renovada. */
    erro?: string;
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    backendToken?: string;
    refreshToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    backendToken?: string;
    refreshToken?: string;
    /** Momento de expiracao do backendToken, em milissegundos. */
    expiraEm?: number;
    erro?: string;
  }
}
