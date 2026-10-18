import { join } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { SupabaseModule } from './banco/supabase.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // O .env fica na RAIZ do monorepo e e lido tambem pelo frontend. De
      // src/ (testes) ou de dist/ (producao) a raiz esta sempre dois niveis
      // acima, entao o caminho nao depende de qual pasta o processo foi
      // iniciado.
      envFilePath: join(__dirname, '..', '..', '.env'),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 10 }]),
    SupabaseModule,
    UsuariosModule,
    AuthModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
