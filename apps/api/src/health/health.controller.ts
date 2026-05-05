import { Controller, Get } from '@nestjs/common';

/**
 * /health — シンプルなヘルスチェック。
 * Railway / Cloudflare のヘルスチェックから呼ばれる。
 */
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok' as const,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? '0.0.0',
    };
  }
}
