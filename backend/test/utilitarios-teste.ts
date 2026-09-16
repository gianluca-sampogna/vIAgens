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
 * Apaga os usuarios criados pelos testes. O cascade do schema leva junto
 * conta_social, preferencias_gerais e refresh_token.
 */
export async function limparUsuariosDeTeste(
  app: INestApplication,
): Promise<void> {
  const supabase = app.get(SupabaseService);
  await supabase.cliente.from('usuario').delete().like('email', '%@teste.viagens');
}
