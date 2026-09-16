import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface CorpoDeErro {
  statusCode: number;
  mensagem: string;
  timestamp: string;
}

@Catch()
export class FiltroExcecaoHttp implements ExceptionFilter {
  private readonly logger = new Logger(FiltroExcecaoHttp.name);

  catch(excecao: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<Response>();
    const requisicao = contexto.getRequest<Request>();

    const status =
      excecao instanceof HttpException
        ? excecao.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const mensagem = this.extrairMensagem(excecao, status);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      // O stack fica no log do servidor, nunca na resposta.
      this.logger.error(`${requisicao.method} ${requisicao.url}`, excecao);
    }

    const corpo: CorpoDeErro = {
      statusCode: status,
      mensagem,
      timestamp: new Date().toISOString(),
    };

    resposta.status(status).json(corpo);
  }

  private extrairMensagem(excecao: unknown, status: number): string {
    if (excecao instanceof HttpException) {
      const conteudo = excecao.getResponse();

      if (typeof conteudo === 'string') {
        return conteudo;
      }

      if (typeof conteudo === 'object' && conteudo !== null) {
        const message = (conteudo as { message?: string | string[] }).message;
        if (Array.isArray(message)) {
          return message.join('; ');
        }
        if (typeof message === 'string') {
          return message;
        }
      }
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return 'Erro interno do servidor';
    }

    return 'Erro ao processar a requisicao';
  }
}
