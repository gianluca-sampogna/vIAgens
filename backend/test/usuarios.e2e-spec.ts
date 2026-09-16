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
    await limparUsuariosDeTeste(app, 'usuarios');

    const resposta = await request(app.getHttpServer())
      .post('/auth/registrar')
      .send({
        nome: 'Rafael',
        email: 'perfil@usuarios.teste.viagens',
        senha: 'senha-bem-segura',
      })
      .expect(201);

    accessToken = resposta.body.accessToken;
  });

  afterAll(async () => {
    await limparUsuariosDeTeste(app, 'usuarios');
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
        email: 'perfil@usuarios.teste.viagens',
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

  describe('PATCH /usuarios/eu', () => {
    it('atualiza o nome e as preferencias gerais', async () => {
      const resposta = await request(app.getHttpServer())
        .patch('/usuarios/eu')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nome: 'Rafael Bassul',
          preferencias: {
            orcamentoReferencia: 3500.5,
            interessesPadrao: ['praia', 'gastronomia'],
            climaPreferido: 'quente',
          },
        })
        .expect(200);

      expect(resposta.body.nome).toBe('Rafael Bassul');
    });

    it('recusa tentativa de alterar o papel', async () => {
      await request(app.getHttpServer())
        .patch('/usuarios/eu')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ papel: 'ADMINISTRADOR' })
        .expect(400);
    });

    it('recusa tentativa de alterar o e-mail', async () => {
      await request(app.getHttpServer())
        .patch('/usuarios/eu')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ email: 'outro@usuarios.teste.viagens' })
        .expect(400);
    });

    it('recusa requisicao sem token', async () => {
      await request(app.getHttpServer())
        .patch('/usuarios/eu')
        .send({ nome: 'Qualquer' })
        .expect(401);
    });
  });
});
