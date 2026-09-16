import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from './supabase.service';

function criarConfig(valores: Record<string, string | undefined>): ConfigService {
  return {
    get: (chave: string) => valores[chave],
  } as unknown as ConfigService;
}

describe('SupabaseService', () => {
  it('expoe um cliente quando a configuracao esta completa', () => {
    const service = new SupabaseService(
      criarConfig({
        SUPABASE_URL: 'https://exemplo.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste',
      }),
    );

    expect(service.cliente).toBeDefined();
    expect(typeof service.cliente.from).toBe('function');
  });

  it('falha ao subir quando SUPABASE_URL esta ausente', () => {
    expect(
      () =>
        new SupabaseService(
          criarConfig({ SUPABASE_SERVICE_ROLE_KEY: 'chave-de-teste' }),
        ),
    ).toThrow(/SUPABASE_URL/);
  });

  it('falha ao subir quando a service_role esta ausente', () => {
    expect(
      () =>
        new SupabaseService(
          criarConfig({ SUPABASE_URL: 'https://exemplo.supabase.co' }),
        ),
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
