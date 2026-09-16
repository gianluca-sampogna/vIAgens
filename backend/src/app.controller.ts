import { Controller, Get } from '@nestjs/common';

@Controller('saude')
export class AppController {
  @Get()
  verificar(): { status: string } {
    return { status: 'ok' };
  }
}
