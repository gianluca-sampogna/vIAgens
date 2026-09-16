import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppDeTeste, limparUsuariosDeTeste } from './utilitarios-teste';

describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    app = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparUsuariosDeTeste(app);

    const resposta = await request(app.getHttpServer())
      .post('/auth/registrar')
      .send({
        nome: 'Rafael',
        email: 'perfil@teste.viagens',
        senha: 'senha-bem-segura',
      })
      .expect(201);

    accessToken = resposta.body.accessToken;
  });

  afterAll(async () => {
    await limparUsuariosDeTeste(app);
    await app.close();
  });

  describe('GET /usuarios/eu', () => {
    it('devolve o perfil do portador do token', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/usuarios/eu')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(resposta.body).toMatchObject({
        nome: 'Rafael',
        email: 'perfil@teste.viagens',
        papel: 'USUARIO',
      });
      expect(resposta.body).not.toHaveProperty('senhaHash');
    });

    it('recusa requisicao sem token com 401', async () => {
      await request(app.getHttpServer()).get('/usuarios/eu').expect(401);
    });

    it('recusa token invalido com 401', async () => {
      await request(app.getHttpServer())
        .get('/usuarios/eu')
        .set('Authorization', 'Bearer token-inventado')
        .expect(401);
    });
  });
});
