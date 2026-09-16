import { AuthGuard } from '@nestjs/passport';

/**
 * Guard para autenticacao JWT.
 * NÃO usar @Injectable() pois isso causaria conflitos de resolução de dependências.
 */
export class JwtAuthGuard extends AuthGuard('jwt') {}
