import { describe, it, expect, vi } from 'vitest';
import {
  ArgumentsHost,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { FiltroExcecaoHttp } from './filtro-excecao-http';

function criarHostFalso() {
  const resposta = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  const requisicao = { method: 'POST', url: '/qualquer' };

  const host = {
    switchToHttp: () => ({
      getResponse: () => resposta,
      getRequest: () => requisicao,
    }),
  } as unknown as ArgumentsHost;

  return { host, resposta };
}

describe('FiltroExcecaoHttp', () => {
  it('devolve mensagem generica para excecao 500, mesmo com mensagem detalhada', () => {
    const filtro = new FiltroExcecaoHttp();
    const { host, resposta } = criarHostFalso();

    const excecao = new InternalServerErrorException(
      'Falha ao criar usuario: duplicate key value violates unique constraint "usuario_email_key"',
    );

    filtro.catch(excecao, host);

    expect(resposta.status).toHaveBeenCalledWith(500);
    expect(resposta.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        mensagem: 'Erro interno do servidor',
      }),
    );
    // A mensagem detalhada nao pode vazar para o corpo da resposta.
    const corpo = resposta.json.mock.calls[0][0];
    expect(corpo.mensagem).not.toContain('usuario_email_key');
    expect(corpo.mensagem).not.toContain('duplicate key');
  });

  it('mantem a mensagem especifica para excecao 4xx', () => {
    const filtro = new FiltroExcecaoHttp();
    const { host, resposta } = criarHostFalso();

    const excecao = new ConflictException('E-mail ja cadastrado');

    filtro.catch(excecao, host);

    expect(resposta.status).toHaveBeenCalledWith(409);
    expect(resposta.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        mensagem: 'E-mail ja cadastrado',
      }),
    );
  });

  it('registra a mensagem detalhada no logger do servidor para 500', () => {
    const filtro = new FiltroExcecaoHttp();
    const { host } = criarHostFalso();
    const logger = (filtro as unknown as { logger: { error: (...args: unknown[]) => void } })
      .logger;
    const espiao = vi.spyOn(logger, 'error').mockImplementation(() => undefined);

    const excecao = new InternalServerErrorException(
      'Falha ao criar usuario: detalhe interno sensivel',
    );

    filtro.catch(excecao, host);

    expect(espiao).toHaveBeenCalled();
    const argumentos = espiao.mock.calls[0];
    expect(String(argumentos[1])).toContain('detalhe interno sensivel');
  });
});
