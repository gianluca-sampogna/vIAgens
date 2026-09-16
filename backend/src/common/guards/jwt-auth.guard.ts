import { Inject, Injectable, Optional } from '@nestjs/common';
import { AuthGuard, AuthModuleOptions } from '@nestjs/passport';

/**
 * Guard de autenticacao JWT. Ponto unico usado pelos controllers para
 * exigir um access token valido (ex: @UseGuards(JwtAuthGuard)).
 *
 * O construtor abaixo reaplica @Optional()/@Inject(AuthModuleOptions)
 * porque o Nest le o metadado de dependencia opcional com
 * Reflect.getOwnMetadata (sem subir a cadeia de prototipos), enquanto o
 * tipo do parametro e o token de @Inject sao lidos com Reflect.getMetadata
 * (que sobe a cadeia). Sem isso, a subclasse herda o parametro e o token
 * de AuthGuard('jwt'), mas nao a marca de opcional, e o Nest passa a
 * exigir um provider de AuthModuleOptions que nenhum modulo registra
 * (nenhum lugar chama PassportModule.register()), quebrando a resolucao
 * de dependencias.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(@Optional() @Inject(AuthModuleOptions) options: AuthModuleOptions) {
    super(options);
  }
}
