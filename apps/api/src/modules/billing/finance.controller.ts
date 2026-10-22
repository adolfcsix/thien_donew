import {Body,Controller,Get,Param,Patch,Post,Query,Req,HttpCode} from '@nestjs/common';
import type {Request} from 'express';
import {FinanceService} from './finance.service';
@Controller('api/billing')
export class FinancePublicController {
 constructor(private readonly finance:FinanceService){}
 @Get('bank-instructions') bank(){return this.finance.bankPublic();}
}
@Controller('api/admin/finance')
export class FinanceAdminController {
 constructor(private readonly finance:FinanceService){}
 @Get() dashboard(@Req() req:Request,@Query() query:Record<string,unknown>){return this.finance.finance(req,query);}
 @Get('bank') bank(@Req() req:Request){return this.finance.bankAdmin(req);}
 @Patch('bank') bankUpdate(@Req() req:Request,@Body() body:unknown){return this.finance.bankUpdate(req,body);}
 @Get('ai-quotas') quotas(@Req() req:Request){return this.finance.quotas(req);}
 @Patch('ai-quotas') quotasUpdate(@Req() req:Request,@Body() body:unknown){return this.finance.updateQuotas(req,body);}
 @Post('orders/:id/reconcile') @HttpCode(200) reconcile(@Req() req:Request,@Param('id') id:string){return this.finance.reconcile(req,id);}
 @Post('orders/:id/refund-request') @HttpCode(200) request(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.finance.requestRefund(req,id,body);}
 @Post('orders/:id/refund-approval') @HttpCode(200) approve(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.finance.approveRefund(req,id,body);}
 @Post('orders/:id/refund-complete') @HttpCode(200) complete(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.finance.completeRefund(req,id,body);}
}
