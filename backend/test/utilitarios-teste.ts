import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
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
