import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { criarAppDeTeste, limparUsuariosDeTeste } from './utilitarios-teste';
import { SupabaseService } from '../src/banco/supabase.service';
import { UsuariosRepository } from '../src/usuarios/usuarios.repository';

describe('Autenticacao (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparUsuariosDeTeste(app, 'auth');
  });

  afterAll(async () => {
    await limparUsuariosDeTeste(app, 'auth');
    await app.close();
  });

  describe('POST /auth/registrar', () => {
    it('cria a conta e devolve o usuario sem o hash da senha', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/registrar')
        .send({
          nome: 'Rafael',
          email: 'rafael@auth.teste.viagens',
          senha: 'senha-bem-segura',
        })
        .expect(201);

      expect(resposta.body.usuario).toMatchObject({
        nome: 'Rafael',
        email: 'rafael@auth.teste.viagens',
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
        email: 'repetido@auth.teste.viagens',
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
          email: 'curta@auth.teste.viagens',
          senha: 'curta',
        })
        .expect(400);
    });

    it('ignora campo nao declarado no DTO e recusa a requisicao', async () => {
      await request(app.getHttpServer())
        .post('/auth/registrar')
        .send({
          nome: 'Invasor',
          email: 'invasor@auth.teste.viagens',
          senha: 'senha-bem-segura',
          papel: 'ADMINISTRADOR',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    const conta = {
      nome: 'Rafael',
      email: 'login@auth.teste.viagens',
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
        .send({ email: 'ninguem@auth.teste.viagens', senha: 'senha-bem-segura' })
        .expect(401);

      expect(senhaErrada.body.mensagem).toBe('E-mail ou senha invalidos');
      expect(emailInexistente.body.mensagem).toBe(senhaErrada.body.mensagem);
    });
  });

  describe('POST /auth/social-login', () => {
    it('recusa id_token invalido com 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/social-login')
        .send({ idToken: 'token-completamente-invalido' })
        .expect(401);
    });

    it('recusa corpo sem idToken com 400', async () => {
      await request(app.getHttpServer())
        .post('/auth/social-login')
        .send({})
        .expect(400);
    });
  });

  describe('Vinculacao de conta', () => {
    it('vincula o Google a uma conta que ja existia por e-mail e senha', async () => {
      const supabase = app.get(SupabaseService);
      const repositorio = app.get(UsuariosRepository);

      await request(app.getHttpServer())
        .post('/auth/registrar')
        .send({
          nome: 'Rafael',
          email: 'vinculo@auth.teste.viagens',
          senha: 'senha-bem-segura',
        })
        .expect(201);

      const usuario = await repositorio.vincularOuCriarPorGoogle({
        provedorContaId: 'google-vinculo-1',
        email: 'vinculo@auth.teste.viagens',
        nome: 'Rafael do Google',
        avatarUrl: 'https://exemplo.com/foto.png',
      });

      // Mesma conta, nao uma segunda
      const { data: contas } = await supabase.cliente
        .from('usuario')
        .select('id')
        .eq('email', 'vinculo@auth.teste.viagens');
      expect(contas).toHaveLength(1);
      expect(usuario.id).toBe(contas![0].id);

      // A senha original continua valendo
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'vinculo@auth.teste.viagens', senha: 'senha-bem-segura' })
        .expect(200);

      const { data: sociais } = await supabase.cliente
        .from('conta_social')
        .select('provedor_conta_id')
        .eq('usuario_id', usuario.id);
      expect(sociais).toHaveLength(1);
      expect(sociais![0].provedor_conta_id).toBe('google-vinculo-1');
    });

    it('cria conta nova quando o e-mail ainda nao existe', async () => {
      const repositorio = app.get(UsuariosRepository);

      const usuario = await repositorio.vincularOuCriarPorGoogle({
        provedorContaId: 'google-novo-1',
        email: 'novo@auth.teste.viagens',
        nome: 'Usuario Novo',
        avatarUrl: null,
      });

      expect(usuario.senhaHash).toBeNull();
      expect(usuario.email).toBe('novo@auth.teste.viagens');
    });

    it('reconhece o mesmo provedorContaId como login, sem duplicar', async () => {
      const repositorio = app.get(UsuariosRepository);
      const perfil = {
        provedorContaId: 'google-repetido-1',
        email: 'repetido-social@auth.teste.viagens',
        nome: 'Usuario',
        avatarUrl: null,
      };

      const primeiro = await repositorio.vincularOuCriarPorGoogle(perfil);
      const segundo = await repositorio.vincularOuCriarPorGoogle(perfil);

      expect(segundo.id).toBe(primeiro.id);
    });
  });
});
