-- Vinculacao de conta do login social, como funcao do banco.
--
-- Por que no banco e nao no NestJS: o PostgREST nao faz transacao de varias
-- instrucoes. Os tres casos abaixo precisam ser atomicos, senao duas abas
-- fazendo login ao mesmo tempo criam duas contas para o mesmo e-mail.
--
-- Casos resolvidos:
--   1. conta social ja conhecida -> e login, devolve o usuario existente
--   2. e-mail ja cadastrado      -> vincula o Google a conta existente
--   3. nenhum dos dois           -> cria usuario novo, sem senha
--
-- Quem chama ja validou o id_token do Google, inclusive email_verified.

create or replace function vincular_ou_criar_por_google(
  p_provedor_conta_id text,
  p_email             text,
  p_nome              text,
  p_avatar_url        text
)
returns usuario
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_email    text := lower(trim(p_email));
  v_usuario  usuario;
begin
  -- Caso 1: conta social ja conhecida
  select u.* into v_usuario
  from conta_social cs
  join usuario u on u.id = cs.usuario_id
  where cs.provedor = 'GOOGLE'
    and cs.provedor_conta_id = p_provedor_conta_id;

  if found then
    return v_usuario;
  end if;

  -- Caso 2: e-mail ja cadastrado, vincula
  select * into v_usuario from usuario where email = v_email;

  if found then
    insert into conta_social (usuario_id, provedor, provedor_conta_id)
    values (v_usuario.id, 'GOOGLE', p_provedor_conta_id);

    -- So preenche o avatar se a conta ainda nao tinha um.
    if v_usuario.avatar_url is null and p_avatar_url is not null then
      update usuario
      set avatar_url = p_avatar_url
      where id = v_usuario.id
      returning * into v_usuario;
    end if;

    return v_usuario;
  end if;

  -- Caso 3: usuario novo, sem senha
  insert into usuario (nome, email, senha_hash, avatar_url)
  values (p_nome, v_email, null, p_avatar_url)
  returning * into v_usuario;

  insert into preferencias_gerais (usuario_id) values (v_usuario.id);

  insert into conta_social (usuario_id, provedor, provedor_conta_id)
  values (v_usuario.id, 'GOOGLE', p_provedor_conta_id);

  return v_usuario;
end;
$$;
