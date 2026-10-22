import {Controller,Get,Post,Patch,Body,Req,Param,Query,HttpCode} from '@nestjs/common';
import type {Request} from 'express';
import {BillingService} from './billing.service';
import {AdminService} from './admin.service';
@Controller('api/billing')
export class BillingController {
 constructor(private readonly service:BillingService){}
 @Get('consultation-plans') consultationPlans(){return this.service.consultationCatalog();}
 @Get('consultations') consultations(@Req() r:Request){return this.service.consultations(r);}
 @Get('plans') plans(){return this.service.plans();}
 @Get('access') access(@Req() r:Request){return this.service.access(r);}
 @Get('orders') orders(@Req() r:Request){return this.service.orders(r);}
 @Get('orders/:id') order(@Req() r:Request,@Param('id') id:string){return this.service.order(r,id);}
 @Post('orders') @HttpCode(200) create(@Req() r:Request,@Body() b:unknown){return this.service.createOrder(r,b);}
 @Post('orders/:id/reconcile') @HttpCode(200) reconcile(@Req() r:Request,@Param('id') id:string){return this.service.reconcile(r,id);}
 @Post('orders/:id/cancel') @HttpCode(200) cancel(@Req() r:Request,@Param('id') id:string){return this.service.cancel(r,id);}
 @Post('webhook/payos') @HttpCode(200) webhook(@Body() b:unknown){return this.service.webhook(b);}
 @Post('research-report') @HttpCode(200) report(@Req() r:Request,@Body() b:unknown){return this.service.report(r,b);}
}
@Controller('api/admin')
export class AdminController {
 constructor(private readonly service:AdminService){}
 @Get('consultation-config') consultationConfig(@Req() r:Request){return this.service.consultationConfig(r);}
 @Patch('consultation-config') saveConsultationConfig(@Req() r:Request,@Body() b:unknown){return this.service.saveConsultationConfig(r,b);}
 @Get('consultations') consultations(@Req() r:Request){return this.service.consultationRequests(r);}
 @Patch('consultations/:id') consultationStatus(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.consultationStatus(r,id,b);}
 @Get('overview') overview(@Req() r:Request){return this.service.overview(r);}
 @Get('users') users(@Req() r:Request,@Query('q') q?:string){return this.service.users(r,q||'');}
 @Patch('users/:id/block') block(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.block(r,id,b);}
 @Patch('users/:id/role') role(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.role(r,id,b);}
 @Patch('plans/:id') plan(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.plan(r,id,b);}
 @Get('orders') orders(@Req() r:Request){return this.service.orders(r);}
 @Patch('orders/:id/refund') refund(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.recordRefund(r,id,b);}
 @Get('entitlements') entitlements(@Req() r:Request){return this.service.entitlements(r);}
 @Post('entitlements') grant(@Req() r:Request,@Body() b:unknown){return this.service.grant(r,b);}
 @Patch('entitlements/:id/revoke') revoke(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.revoke(r,id,b);}
 @Get('audit') audit(@Req() r:Request){return this.service.audit(r);}
 @Get('posts') posts(@Req() r:Request){return this.service.posts(r);}
 @Post('posts') save(@Req() r:Request,@Body() b:unknown){return this.service.savePost(r,b);}
}
@Controller('api/articles')
export class ArticlesController {
 constructor(private readonly service:AdminService){}
 @Get() posts(){return this.service.publicPosts();}
}
