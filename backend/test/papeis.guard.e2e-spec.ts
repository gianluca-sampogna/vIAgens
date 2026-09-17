import { Controller, Get, INestApplication, Module, UseGuards } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FiltroExcecaoHttp } from '../src/common/filtros/filtro-excecao-http';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PapeisGuard } from '../src/common/guards/papeis.guard';
import { Papeis } from '../src/common/decorators/papeis.decorator';
import { Papel } from '../src/banco/tipos-banco';
import { SupabaseService } from '../src/banco/supabase.service';
import { limparThrottler, limparUsuariosDeTeste } from './utilitarios-teste';

/**
 * Rota descartavel, so para provar que JwtAuthGuard + PapeisGuard funcionam
 * quando montados de verdade num app Nest, com Reflector e passport
 * resolvidos pelo container - e nao so instanciados a mao num teste
 * unitario. Nao existe em codigo de producao: as rotas administrativas de
 * verdade (RF15-RF17) estao fora deste plano.
 */
@Controller('teste-papeis')
class RotaAdminDescartavelController {
  @Get('somente-admin')
  @UseGuards(JwtAuthGuard, PapeisGuard)
  @Papeis(Papel.ADMINISTRADOR)
  handler(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [RotaAdminDescartavelController] })
class ModuloTesteDescartavelController {}

describe('PapeisGuard montado num app real (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule, ModuloTesteDescartavelController],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalFilters(new FiltroExcecaoHttp());
    await app.init();
  });

  beforeEach(async () => {
    await limparUsuariosDeTeste(app, 'papeis');
    limparThrottler(app);
  });

  afterAll(async () => {
    await limparUsuariosDeTeste(app, 'papeis');
    await app.close();
  });

  it('401 sem token, 403 para USUARIO, 200 para ADMINISTRADOR', async () => {
    const registrado = await request(app.getHttpServer())
      .post('/auth/registrar')
      .send({
        nome: 'Usuario Comum',
        email: 'comum@papeis.teste.viagens',
        senha: 'senha-bem-segura',
      })
      .expect(201);

    const accessToken = registrado.body.accessToken as string;
    const usuarioId = registrado.body.usuario.id as string;

    await request(app.getHttpServer())
      .get('/teste-papeis/somente-admin')
      .expect(401);

    await request(app.getHttpServer())
      .get('/teste-papeis/somente-admin')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    // JwtStrategy consulta o banco a cada requisicao (deliberado, RF16),
    // entao promover o papel no banco basta - o mesmo access token ja
    // emitido passa a valer sem precisar de um token novo.
    const supabase = app.get(SupabaseService);
    const { error } = await supabase.cliente
      .from('usuario')
      .update({ papel: 'ADMINISTRADOR' })
      .eq('id', usuarioId);
    expect(error).toBeNull();

    await request(app.getHttpServer())
      .get('/teste-papeis/somente-admin')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
