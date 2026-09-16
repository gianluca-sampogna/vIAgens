import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { FiltroExcecaoHttp } from '../src/common/filtros/filtro-excecao-http';

describe('Infraestrutura da aplicacao (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    app.useGlobalFilters(new FiltroExcecaoHttp());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 em GET /saude', async () => {
    const resposta = await request(app.getHttpServer()).get('/saude').expect(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('formata erro 404 no padrao da aplicacao', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/rota-que-nao-existe')
      .expect(404);

    expect(resposta.body).toMatchObject({
      statusCode: 404,
      mensagem: expect.any(String),
    });
    expect(typeof resposta.body.timestamp).toBe('string');
  });
});
