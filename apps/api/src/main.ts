import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, raw } from 'express';
import { isTrustedMutation } from './common/origin-policy';
import { runtimeConfig } from './common/runtime-config';
import { operationsMiddleware, SafeExceptionFilter } from './common/operations';
async function bootstrap() {
  // Validate before NestFactory creates providers (including the PostgreSQL pool).
  const config = runtimeConfig(process.env);
  const prod = config.production;
  const allowed = config.webOrigin;
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableShutdownHooks();
  const adapter = app.getHttpAdapter().getInstance();
  adapter.disable('x-powered-by');
  app.use(operationsMiddleware);
  app.useGlobalFilters(new SafeExceptionFilter());
  adapter.use((req: any, res: any, next: () => void) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');
    if (prod) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && req.path !== '/api/billing/webhook/payos') {
      if (!isTrustedMutation(req.headers.origin, req.headers['sec-fetch-site'], allowed)) {
        return res.status(403).json({ error: 'Nguồn yêu cầu không hợp lệ' });
      }
    }
    next();
  });
  // The validated archive route needs up to 2 MiB; all other API routes retain 80 KiB.
  app.use('/api/study/import', json({ limit: '2mb' }));
  // CMS can accept long drafts; route-specific and bounded, other requests stay at 80 KiB.
  app.use('/api/van-kho/admin/documents', json({ limit: '256kb' }));
  app.use('/api/auth/avatar', raw({ type: ['image/jpeg','image/png','image/webp'], limit:'300kb' }));
  app.use('/api/forum/media', raw({ type: ['image/jpeg','image/png','image/webp'], limit:'1mb' }));
  app.use(json({ limit: '80kb' }));
  app.enableCors({ origin: allowed, credentials: true, methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'X-Book-File-Bytes'] });
  // Express body parser failures occur before Nest controller filters.
  app.use((error: any, req: any, res: any, next: any) => {
    if (!error) return next();
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    if (status === 500) console.error(JSON.stringify({event:'parser_error',requestId:res.locals.requestId,status}));
    return res.status(status).json({statusCode:status,message:status===413?'Dữ liệu vượt giới hạn':'Yêu cầu không hợp lệ',requestId:res.locals.requestId});
  });
  const port = config.port;
  await app.listen(port, config.host);
  console.log(`THIÊN ĐỒ API listening on ${config.host}:${port}`);
}
bootstrap().catch(error => { console.error('API không khởi động được:', error); process.exitCode = 1; });
