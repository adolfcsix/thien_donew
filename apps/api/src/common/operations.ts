import {Catch,HttpException,type ExceptionFilter,type ArgumentsHost} from '@nestjs/common';
import {randomUUID} from 'node:crypto';
import type {Request,Response,NextFunction} from 'express';

/** No request bodies, query strings, cookies, email addresses or raw error messages in logs. */
export function operationsMiddleware(req:Request,res:Response,next:NextFunction) {
 const supplied=req.headers['x-request-id'];
 const id=typeof supplied==='string'&&/^[a-zA-Z0-9-]{16,64}$/.test(supplied)?supplied:randomUUID();
 res.locals.requestId=id;res.setHeader('X-Request-ID',id);
 const start=process.hrtime.bigint();
 res.on('finish',()=>console.log(JSON.stringify({event:'http_request',requestId:id,method:req.method,status:res.statusCode,durationMs:Math.round(Number(process.hrtime.bigint()-start)/1e6)})));
 next();
}
/** Only fixed diagnostic categories are permitted in logs; raw pg messages may
 * contain SQL statements or environment details. Recurse at most one cause.
 */
export function failureCategory(error:unknown):string {
 const value=error&&typeof error==='object'?error as {code?:unknown;cause?:unknown}:{};
 const nested=value.cause&&typeof value.cause==='object'?value.cause as {code?:unknown}:{};
 const code=typeof value.code==='string'?value.code:typeof nested.code==='string'?nested.code:'';
 if(code==='42P01'||code==='42703')return 'db_schema_incomplete';
 if(code==='3D000')return 'db_database_missing';
 if(code==='28P01'||code==='28000')return 'db_credentials_rejected';
 if(code==='42501')return 'db_permissions';
 if(code.startsWith('08')||['ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENOTFOUND','57P03','53300'].includes(code))return 'db_unavailable';
 if(code==='23505')return 'db_unique_constraint';
 return 'internal';
}
@Catch()
export class SafeExceptionFilter implements ExceptionFilter {
 catch(error:unknown,host:ArgumentsHost) {
  const res=host.switchToHttp().getResponse<Response>();
  const status=error instanceof HttpException?error.getStatus():500;
  if(status>=500)console.error(JSON.stringify({event:'api_error',requestId:res.locals.requestId,status,category:failureCategory(error)}));
  const payload=status<500&&error instanceof HttpException?error.getResponse():null;
  const message=typeof payload==='string'?payload:payload&&typeof payload==='object'&&'message' in payload?payload.message:'Lỗi máy chủ. Vui lòng thử lại sau';
  res.status(status).json({statusCode:status,message,requestId:res.locals.requestId});
 }
}
