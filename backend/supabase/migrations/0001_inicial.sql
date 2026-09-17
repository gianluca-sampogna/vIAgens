-- Migration inicial do vIAgens: usuario, conta social, preferencias e refresh token.
--
-- Colunas em snake_case (convencao do Postgres). A camada de repositorio no
-- NestJS converte para camelCase, que e o que o resto do backend usa.
--
-- RLS fica habilitado em todas as tabelas SEM nenhuma policy. Isso nega tudo
-- por padrao: o backend acessa com a service_role, que ignora RLS, e qualquer
-- chave publicavel que aponte para estas tabelas nao le nem escreve nada.

create type papel as enum ('USUARIO', 'ADMINISTRADOR');
create type provedor_social as enum ('GOOGLE');

-- Mantem atualizado_em sempre coerente sem depender do codigo da aplicacao.
create or replace function definir_atualizado_em()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create table usuario (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  email         text not null unique,
  senha_hash    text,
  avatar_url    text,
  papel         papel not null default 'USUARIO',
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger usuario_atualizado_em
  before update on usuario
  for each row
  execute function definir_atualizado_em();

-- Tabela propria por provedor: um provedor novo (Apple, GitHub) entra como
-- linha, nao como coluna nova em usuario.
create table conta_social (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null references usuario (id) on delete cascade,
  provedor          provedor_social not null,
  provedor_conta_id text not null,
  criado_em         timestamptz not null default now(),
  unique (provedor, provedor_conta_id)
);

create index conta_social_usuario_id_idx on conta_social (usuario_id);

create table preferencias_gerais (
  usuario_id            uuid primary key references usuario (id) on delete cascade,
  orcamento_referencia  numeric(12, 2),
  interesses_padrao     text[] not null default '{}',
  estilo_viagem_padrao  text,
  clima_preferido       text
);

-- O refresh token e guardado apenas como hash sha256: um vazamento desta
-- tabela nao entrega sessao de ninguem.
create table refresh_token (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references usuario (id) on delete cascade,
  token_hash  text not null unique,
  expira_em   timestamptz not null,
  revogado_em timestamptz,
  criado_em   timestamptz not null default now()
);

create index refresh_token_usuario_id_idx on refresh_token (usuario_id);

alter table usuario              enable row level security;
alter table conta_social         enable row level security;
alter table preferencias_gerais  enable row level security;
alter table refresh_token        enable row level security;
