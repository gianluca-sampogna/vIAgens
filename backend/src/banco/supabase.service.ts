import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from './tipos-banco';

@Injectable()
export class SupabaseService {
  private readonly clienteInterno: SupabaseClient<Database>;

  constructor(config: ConfigService) {
    const url = config.get<string>('SUPABASE_URL');
    const chave = config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url) {
      throw new Error('SUPABASE_URL nao configurada');
    }

    if (!chave) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY nao configurada');
    }

    // A service_role ignora RLS e nao tem sessao de usuario: desligamos
    // persistencia e refresh automatico, que so fazem sentido no navegador.
    this.clienteInterno = createClient<Database>(url, chave, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  get cliente(): SupabaseClient<Database> {
    return this.clienteInterno;
  }
}
