-- Corrige aviso do linter de seguranca da Supabase
-- (0011_function_search_path_mutable).
--
-- definir_atualizado_em foi criada em 0001 sem search_path fixo. Funcao com
-- search_path mutavel pode ser induzida a resolver um nome para objeto de
-- outro schema, controlado por quem chama. Fixar em public fecha isso.
--
-- A migration 0001 nao foi alterada de proposito: ela ja foi aplicada, e
-- reescrever historico de migration faz o repo divergir do banco real.

alter function definir_atualizado_em() set search_path = public;
