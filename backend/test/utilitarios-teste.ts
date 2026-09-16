import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { FiltroExcecaoHttp } from '../src/common/filtros/filtro-excecao-http';
import { SupabaseService } from '../src/banco/supabase.service';

export async function criarAppDeTeste(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new FiltroExcecaoHttp());
  await app.init();
  return app;
}

/**
 * Apaga os usuarios criados pelos testes de um arquivo especifico. O
 * cascade do schema leva junto conta_social, preferencias_gerais e
 * refresh_token.
 *
 * O sufixo isola os dados de cada arquivo de teste (ex: 'auth' apaga
 * apenas '%@auth.teste.viagens'), para que a limpeza de um arquivo nunca
 * alcance os usuarios criados por outro, mesmo se a suite voltar a
 * rodar em paralelo no futuro.
 */
export async function limparUsuariosDeTeste(
  app: INestApplication,
  sufixo: string,
): Promise<void> {
  const supabase = app.get(SupabaseService);
  await supabase.cliente
    .from('usuario')
    .delete()
    .like('email', `%@${sufixo}.teste.viagens`);
}

/**
 * Zera os contadores do ThrottlerGuard entre testes. Sem isso, as
 * chamadas de setup que cada teste faz a /auth/registrar (ou /auth/login)
 * se acumulam na mesma janela de 60s do limite de 10 req/min e derrubam
 * testes sem relacao nenhuma com o teste de limite, com um 429 inesperado.
 *
 * Alem do mapa "storage", o ThrottlerStorageService tambem guarda um
 * mapa "timeoutIds" (throttlerName -> lista de NodeJS.Timeout) com um
 * setTimeout agendado para cada hit registrado. O callback desse timer
 * roda "const { totalHits } = this.storage.get(key)" quando o ttl (60s)
 * expira. Se limparmos so o storage, um timer antigo ainda dispara mais
 * tarde contra uma chave que ja foi apagada por um beforeEach seguinte,
 * "this.storage.get(key)" volta undefined, e desestruturar totalHits
 * disso lança excecao nao tratada dentro do callback. Isso so acontece
 * se a suite levar mais de 60s de ponta a ponta (plausivel com hash
 * argon2 e varios beforeEach chamando /auth/registrar, e mais ainda em
 * maquina lenta ou CI carregado), entao cancelamos os timers pendentes
 * tambem.
 *
 * "timeoutIds" e um campo interno do ThrottlerStorageService, nao faz
 * parte da API publica do pacote @nestjs/throttler, e pode quebrar numa
 * atualizacao futura. Esse risco e aceito conscientemente aqui porque o
 * pacote nao oferece nenhuma forma publica de resetar o storage em teste.
 */
export function limparThrottler(app: INestApplication): void {
  const storage = app.get(ThrottlerStorage) as {
    storage: Map<string, unknown>;
    timeoutIds: Map<string, NodeJS.Timeout[]>;
  };
  storage.timeoutIds.forEach((timeouts) => timeouts.forEach(clearTimeout));
  storage.timeoutIds.clear();
  storage.storage.clear();
}
