import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppDeTeste, limparUsuariosDeTeste } from './utilitarios-teste';

describe('Autenticacao (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparUsuariosDeTeste(app);
  });

  afterAll(async () => {
    await limparUsuariosDeTeste(app);
    await app.close();
  });

  describe('POST /auth/registrar', () => {
    it('cria a conta e devolve o usuario sem o hash da senha', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/registrar')
        .send({
          nome: 'Rafael',
          email: 'rafael@teste.viagens',
          senha: 'senha-bem-segura',
        })
        .expect(201);

      expect(resposta.body.usuario).toMatchObject({
        nome: 'Rafael',
        email: 'rafael@teste.viagens',
        papel: 'USUARIO',
      });
      expect(resposta.body.usuario).not.toHaveProperty('senhaHash');
      expect(resposta.body.usuario.id).toEqual(expect.any(String));
      expect(resposta.body.accessToken).toEqual(expect.any(String));
      expect(resposta.body.accessToken.length).toBeGreaterThan(20);
      expect(resposta.body.refreshToken).toEqual(expect.any(String));
      expect(resposta.body.refreshToken).toHaveLength(96);
    });

    it('recusa e-mail ja cadastrado com 409', async () => {
      const corpo = {
        nome: 'Rafael',
        email: 'repetido@teste.viagens',
        senha: 'senha-bem-segura',
      };

      await request(app.getHttpServer())
        .post('/auth/registrar')
        .send(corpo)
        .expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/auth/registrar')
        .send(corpo)
        .expect(409);

      expect(resposta.body.mensagem).toBe('E-mail ja cadastrado');
    });

    it('recusa senha com menos de 8 caracteres', async () => {
      await request(app.getHttpServer())
        .post('/auth/registrar')
        .send({
          nome: 'Rafael',
          email: 'curta@teste.viagens',
          senha: 'curta',
        })
        .expect(400);
    });

    it('ignora campo nao declarado no DTO e recusa a requisicao', async () => {
      await request(app.getHttpServer())
        .post('/auth/registrar')
        .send({
          nome: 'Invasor',
          email: 'invasor@teste.viagens',
          senha: 'senha-bem-segura',
          papel: 'ADMINISTRADOR',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const conta = {
      nome: 'Rafael',
      email: 'login@teste.viagens',
      senha: 'senha-bem-segura',
    };

    beforeEach(async () => {
      await request(app.getHttpServer())
        .post('/auth/registrar')
        .send(conta)
        .expect(201);
    });

    it('autentica com a senha correta', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: conta.email, senha: conta.senha })
        .expect(200);

      expect(resposta.body.usuario.email).toBe(conta.email);
      expect(resposta.body.accessToken).toEqual(expect.any(String));
    });

    it('devolve a MESMA mensagem para senha errada e para e-mail inexistente', async () => {
      const senhaErrada = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: conta.email, senha: 'senha-errada-mesmo' })
        .expect(401);

      const emailInexistente = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'ninguem@teste.viagens', senha: 'senha-bem-segura' })
        .expect(401);

      expect(senhaErrada.body.mensagem).toBe('E-mail ou senha invalidos');
      expect(emailInexistente.body.mensagem).toBe(senhaErrada.body.mensagem);
    });
  });
});
