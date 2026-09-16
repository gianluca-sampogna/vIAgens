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

> **Já está implementada.** Esta seção deixou de ser uma proposta e passou a
> descrever o que existe em `frontend/`. Se você for mexer na autenticação do
> frontend, leia isto antes.

O login por e-mail/senha e o login pelo Google compartilham **uma única
sessão**, gerenciada pelo NextAuth. O `proxy.ts` continua sendo a única coisa
que decide o que é rota pública ou privada.

### Onde as peças estão

| Arquivo | Papel |
|---|---|
| `frontend/src/lib/auth.ts` | os três providers, a renovação de token e a revogação no logout |
| `frontend/src/app/(public)/login/page.tsx` | tela com as abas Entrar / Criar conta |
| `frontend/types/next-auth.d.ts` | tipagem de `session.backendToken` e `user.id` |
| `frontend/src/services/api.ts` | helper `comToken()` |
| `frontend/src/app/(private)/dashboard/page.tsx` | exemplo de chamada autenticada |

### Os três providers

- **`google`** — o frontend faz o OAuth, e o callback `jwt` manda o
  `account.id_token` para `POST /auth/social-login`. O backend verifica a
  assinatura com o Google e devolve o nosso par de tokens. O backend **nunca**
  aceita e-mail, nome ou id afirmados pelo cliente.
- **`senha`** — `POST /auth/login`. Devolve `null` em qualquer falha, para não
  distinguir senha errada de e-mail inexistente — o backend já se recusa a
  distinguir, e o frontend não pode reintroduzir a diferença.
- **`cadastro`** — `POST /auth/registrar`. Existe como provider, e não como
  uma chamada solta seguida de login, porque `/auth/registrar` já devolve um
  par de tokens: fazer as duas coisas separadas deixaria o primeiro par órfão,
  válido por 7 dias e sem ninguém para revogá-lo.

### Renovação de sessão

O access token vale 15 minutos; o cookie do NextAuth, 30 dias. Sem renovação,
o usuário continuaria "logado" na interface com toda chamada devolvendo 401.

O callback `jwt` guarda `expiraEm` (lido do `exp` do próprio access token) e
chama `POST /auth/refresh` um minuto antes de vencer. Se a renovação falhar,
o token recebe `erro` e a sessão expõe `session.erro` — o dashboard usa isso
para pedir que o usuário entre de novo, em vez de mostrar erro genérico.

### Logout

O evento `signOut` chama `POST /auth/logout`, que revoga o refresh token.

⚠️ **O access token continua válido até expirar**, mesmo depois do logout. Ele
é autocontido e não consultamos lista de revogados a cada requisição. A janela
é de no máximo 15 minutos. Para este sistema é aceitável; se um dia não for, a
mudança é checar revogação no `JwtStrategy`.

### Chamadas autenticadas

Não existe interceptor global de propósito: `api` é usada tanto no cliente
quanto em Server Components, e `getSession` do `next-auth/react` só funciona no
cliente. O token vai explícito, o que funciona nos dois lados e deixa visível
quais rotas exigem sessão.

```ts
// Client Component
const { data: sessao } = useSession();
const { data } = await api.get("/usuarios/eu", comToken(sessao?.backendToken));

// Server Component
const sessao = await getServerSession(authOptions);
const { data } = await api.get("/usuarios/eu", comToken(sessao?.backendToken));
```

### O que falta

`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` estão vazios, então o botão
"Continuar com Google" não funciona ainda — o backend avisa isso no boot. O
login por e-mail e senha funciona por inteiro e não depende disso.


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
