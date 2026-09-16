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
| `GET` | `/usuarios/eu` | Bearer | perfil do usuário autenticado |
| `PATCH` | `/usuarios/eu` | Bearer | edita nome e preferências gerais |

Erros seguem sempre `{ statusCode, mensagem, timestamp }`.

Rotas `/auth/*` têm limite de 10 requisições por minuto por IP. O limite vale só ali:
aplicá-lo globalmente atrapalharia o uso normal da API quando as rotas de roteiro
existirem.

## Integração com o frontend

> Esta seção é para quem trabalha em `frontend/`.

O TODO original em `frontend/src/lib/auth.ts` enviava
`{ email, name, avatar, googleId }`. Esse formato foi descartado: ele faria o backend
confiar nos dados que o navegador afirma, e qualquer um poderia criar conta com o e-mail
de outra pessoa. O backend espera o `id_token` e extrai os dados de dentro dele, depois de
verificar a assinatura com o Google.

A chamada fica no callback `jwt`, não no `signIn`. O `jwt` recebe `account` preenchido
exatamente no primeiro login, e é o único lugar onde dá para gravar o resultado no token.

```ts
callbacks: {
  async jwt({ token, account }) {
    // account só vem preenchido no primeiro login
    if (account?.id_token) {
      try {
        const { data } = await api.post("/auth/social-login", {
          idToken: account.id_token,
        });
        token.backendToken = data.accessToken;
        token.refreshToken = data.refreshToken;
        token.id = data.usuario.id;
      } catch (error) {
        console.error("Erro ao autenticar no backend:", error);
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
`recuperar`/`criar` de `api.ts` também são chamadas de Server Components, onde é preciso
`getServerSession(authOptions)`. Vale decidir como cobrir os dois lados — por exemplo,
aceitar o token por parâmetro nas chamadas de servidor.

Tipar `session.backendToken` e `user.id` exige um `frontend/types/next-auth.d.ts` com
`declare module "next-auth"`.

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
