# Backend — vIAgens

Serviço NestJS de autenticação e usuário. Roda na porta 3333, que é a que o
frontend espera em `NEXT_PUBLIC_API_URL`.

## Como rodar

```bash
cd backend
yarn install
cp .env.example .env    # preencha os valores
# as migrations ja estao aplicadas; para reaplicar num projeto novo,
# rode os arquivos de supabase/migrations/ em ordem no SQL Editor
yarn start:dev
```

Verifique com `curl http://localhost:3333/saude` — deve responder `{"status":"ok"}`.

## Variáveis de ambiente

Veja `.env.example`. Três armadilhas comuns:

- `SUPABASE_SERVICE_ROLE_KEY` tem que ser a chave **`service_role`**, não a publicável.
  A publicável esbarra no RLS, que nega tudo — o sintoma é toda consulta voltar vazia
  em vez de dar erro de permissão, o que confunde. Essa chave dá acesso total ao banco:
  ela só existe em `backend/.env`, nunca no `frontend/`, cujo bundle é público.
- `GOOGLE_CLIENT_ID` tem que ser **idêntico** ao do frontend. É contra ele que o `aud`
  do `id_token` é validado; se divergir, todo login social devolve 401.
- Hoje `GOOGLE_CLIENT_ID` está **vazio** no `.env` deste projeto. O `VerificadorGoogle`
  avisa isso no boot (log de warning) e `/auth/social-login` fica inoperante até alguém
  do frontend informar o valor real. `/auth/registrar` e `/auth/login` funcionam
  normalmente sem ele.

## Rotas

| Método | Rota | Auth | Descrição |
|---|---|---|---|
| `GET` | `/saude` | — | disponibilidade |
| `POST` | `/auth/registrar` | — | cadastro com e-mail e senha |
| `POST` | `/auth/login` | — | login com e-mail e senha |
| `POST` | `/auth/social-login` | — | login com `id_token` do Google |
| `POST` | `/auth/refresh` | — | troca o refresh token por um par novo |
| `POST` | `/auth/logout` | — | revoga o refresh token |
| `GET` | `/usuarios/eu` | Bearer | perfil do usuário autenticado, com `preferencias` aninhado |
| `PATCH` | `/usuarios/eu` | Bearer | edita nome e/ou preferências gerais; devolve a mesma forma do `GET` |

Erros seguem sempre `{ statusCode, mensagem, timestamp }`.

Rotas `/auth/*` têm limite de 10 requisições por minuto por IP, **por rota**: o
`generateKey` do `ThrottlerGuard` inclui o nome da classe e do handler, então cada
rota tem seu próprio contador independente (ex: errar a senha em `/auth/login`
não consome o orçamento de `/auth/refresh`). O limite vale só nessas rotas:
aplicá-lo globalmente atrapalharia o uso normal da API quando as rotas de roteiro
existirem.

Por ser um limite por IP, ele penaliza usuários atrás de NAT ou rede
compartilhada (faculdade, empresa), onde várias pessoas dividem o mesmo
endereço e passam a disputar o mesmo orçamento de 10 req/min.

## Integração com o frontend

> Esta seção é para quem trabalha em `frontend/`.

O TODO original em `frontend/src/lib/auth.ts` enviava
`{ email, name, avatar, googleId }`. Esse formato foi descartado: ele faria o backend
confiar nos dados que o navegador afirma, e qualquer um poderia criar conta com o e-mail
de outra pessoa. O backend espera o `id_token` e extrai os dados de dentro dele, depois de
verificar a assinatura com o Google.

A chamada fica no callback `jwt`, não no `signIn`. O `jwt` recebe `account` preenchido
exatamente no primeiro login, e é o único lugar onde dá para gravar o resultado no token.

### O access token expira em 15 minutos — o callback `jwt` precisa renovar

`JWT_ACCESS_EXPIRES=15m`, mas o cookie de sessão do NextAuth dura 30 dias por padrão.
Se o callback só gravar `backendToken` no primeiro login (quando `account.id_token`
existe), a partir do minuto 16 toda chamada autenticada ao backend passa a devolver
401, e o usuário continua "logado" na interface do NextAuth sem perceber. O backend já
entrega a rota que resolve isso — `POST /auth/refresh`, que troca um refresh token
válido por um par novo — mas é responsabilidade do frontend chamá-la antes do access
token vencer. O snippet abaixo guarda um instante de expiração aproximado (um pouco
antes do vencimento real, para dar folga) e renova sempre que o `jwt` roda sem um
`account` novo:

```ts
callbacks: {
  async jwt({ token, account }) {
    // account só vem preenchido no primeiro login.
    if (account?.id_token) {
      try {
        const { data } = await api.post("/auth/social-login", {
          idToken: account.id_token,
        });
        token.backendToken = data.accessToken;
        token.refreshToken = data.refreshToken;
        token.backendTokenExpiraEm = Date.now() + 14 * 60 * 1000;
        token.id = data.usuario.id;
      } catch (error) {
        console.error("Erro ao autenticar no backend:", error);
        token.backendToken = undefined;
        token.refreshToken = undefined;
      }
      return token;
    }

    // Chamadas seguintes do NextAuth ao callback jwt (getSession,
    // getServerSession, useSession): sem account novo, so renova quando o
    // access token atual esta perto de vencer.
    const precisaRenovar =
      typeof token.refreshToken === "string" &&
      (typeof token.backendTokenExpiraEm !== "number" ||
        Date.now() > token.backendTokenExpiraEm);

    if (precisaRenovar) {
      try {
        const { data } = await api.post("/auth/refresh", {
          refreshToken: token.refreshToken,
        });
        token.backendToken = data.accessToken;
        token.refreshToken = data.refreshToken;
        token.backendTokenExpiraEm = Date.now() + 14 * 60 * 1000;
      } catch (error) {
        // Refresh token expirado (7 dias) ou ja revogado: a sessao do
        // backend acabou. Limpa os campos para que session() abaixo pare
        // de anexar um Authorization invalido; a UI deve tratar a ausencia
        // de backendToken como "precisa logar nas rotas do backend de
        // novo", mesmo com o cookie do NextAuth ainda valido.
        console.error("Erro ao renovar sessao no backend:", error);
        token.backendToken = undefined;
        token.refreshToken = undefined;
      }
    }

    return token;
  },

  async session({ session, token }) {
    session.backendToken = token.backendToken as string | undefined;
    if (session.user) {
      session.user.id = token.id as string;
    }
    return session;
  },
}
```

O callback `signIn` pode devolver `true` ou ser removido.

### Logout precisa revogar o refresh token no backend

Se o usuário sair só pelo NextAuth (`signOut()`), o cookie de sessão some mas a linha
em `refresh_token` continua válida por até 7 dias (`JWT_REFRESH_EXPIRES`) — o backend
descreve `/auth/logout` como a rota que revoga isso, então algo precisa chamá-la. Com a
estratégia JWT do NextAuth, o evento `signOut` recebe o token decodificado, que já tem
o `refreshToken` gravado pelo callback acima:

```ts
events: {
  async signOut({ token }) {
    if (typeof token.refreshToken === "string") {
      try {
        await api.post("/auth/logout", { refreshToken: token.refreshToken });
      } catch (error) {
        console.error("Erro ao revogar sessao no backend:", error);
      }
    }
  },
}
```

⚠️ **Nota franca sobre o que o logout revoga de fato**: `/auth/logout` revoga só o
*refresh* token. O *access* token já emitido continua válido até expirar naturalmente
— o backend não mantém lista de revogação de access tokens (seria uma consulta a mais
em toda requisição autenticada, o que o `JwtStrategy` já faz por outro motivo, ver
abaixo). Na prática isso é uma janela de até 15 minutos em que um access token
vazado antes do logout ainda funcionaria, mesmo com o refresh já revogado. Para este
sistema esse risco foi aceito conscientemente por causa do `JWT_ACCESS_EXPIRES` curto;
se o produto precisar de revogação imediata de access token, isso é uma mudança de
design (ex.: denylist ou reduzir ainda mais o TTL), não um bug deste comportamento.

Para anexar o token às chamadas autenticadas, em `frontend/src/services/api.ts`:

```ts
api.interceptors.request.use(async (config) => {
  const session = await getSession();
  if (session?.backendToken) {
    config.headers.Authorization = `Bearer ${session.backendToken}`;
  }
  return config;
});
```

⚠️ `getSession` vem de `next-auth/react` e só funciona no cliente. As funções
`recuperar`/`criar` de `api.ts` também são chamadas de Server Components, onde
`getSession` não funciona e é preciso `getServerSession(authOptions)` (que dispara o
mesmo callback `jwt` acima, então também se beneficia da renovação). Isto não tem uma
resposta única deste lado do backend — decidir a forma de cobrir os dois casos é escolha
do frontend, por exemplo:

- aceitar o token por parâmetro nas funções de `api.ts` chamadas de Server Components,
  resolvido com `getServerSession(authOptions)` no componente que chama; ou
- duas instâncias/wrappers de `api.ts`, uma para cliente (via interceptor acima) e outra
  para servidor (recebendo a sessão já resolvida).

Este README não vai além disso porque a escolha depende de como as Server Components
do frontend estão organizadas hoje, algo que este documento não tem visibilidade para
decidir com segurança.

Tipar `session.backendToken`, `user.id` e os campos novos de `token` (`refreshToken`,
`backendTokenExpiraEm`) exige um `frontend/types/next-auth.d.ts` com
`declare module "next-auth"` e `declare module "next-auth/jwt"`.

Em `frontend/src/proxy.ts`, o bloco "ESQUELETO FUTURO" pode passar a checar
`sessionToken?.backendToken`.

⚠️ `/auth/social-login` está inoperante enquanto `GOOGLE_CLIENT_ID` não for preenchido
no `.env` do backend (ver seção de variáveis de ambiente acima) — o valor tem que ser
igual ao usado no frontend.

## Testes

```bash
yarn test        # unitarios (Vitest)
yarn test:e2e    # integracao (Vitest); usa o banco real do Supabase
```

Os testes e2e escrevem no banco configurado em `.env`. Cada arquivo de spec usa um
sufixo de e-mail próprio (`@auth.teste.viagens`, `@usuarios.teste.viagens`) e só apaga
usuários com esse sufixo no seu `beforeEach`/`afterAll`.

Os arquivos e2e rodam com `fileParallelism: false` (ver `vitest.config.e2e.ts`) — ou
seja, um arquivo por vez, nunca em paralelo. Os specs compartilham o mesmo banco
Supabase; se dois arquivos rodassem ao mesmo tempo, o `beforeEach` de um apagaria
usuários (e invalidaria tokens) que o outro acabou de criar e ainda está usando,
produzindo 401/404 instáveis. Isso é proposital: não reative o paralelismo por arquivo
sem repensar o isolamento dos dados de teste.

## Decisões registradas

Dois desvios conscientes do diagrama de classes, aprovados pela equipe:

1. `Administrador` é uma coluna `papel`, não uma tabela. A classe não tem atributo próprio,
   só métodos, e herança em banco relacional custaria um join em toda consulta.
2. `senhaHash` é opcional, e o provedor social fica em tabela separada — quem entra pelo
   Google não tem senha.

### Acesso ao banco

O backend usa `supabase-js` com a chave `service_role`, não um ORM. Não há Prisma nem
connection string de Postgres neste projeto. Consequências que valem saber antes de
mexer no código:

- **Não existe transação pelo cliente.** O PostgREST não faz multi-statement. Quando uma
  operação precisa ser atômica, ela vira função do banco — é o caso de
  `vincular_ou_criar_por_google`, em `supabase/migrations/0002`.
- **Erro não vira exceção.** O `supabase-js` devolve `{ data, error }`; ignorar o `error`
  faz falha de banco passar como "nenhum resultado". Por isso todo acesso passa por
  `lancarSeErro` no repositório.
- **A `service_role` ignora RLS.** As tabelas têm RLS habilitado sem nenhuma policy, o
  que nega tudo por padrão para qualquer outra chave. A segurança efetiva das rotas está
  inteiramente no código do NestJS — não há segunda linha de defesa no banco.
- **Migrations são SQL versionado** em `supabase/migrations/`, aplicadas ao projeto
  `ungwqcebvaczpkdajtec`. Schema novo significa arquivo novo, nunca edição de um já
  aplicado.
