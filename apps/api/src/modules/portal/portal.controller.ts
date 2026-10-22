import {Controller,Get,Post,Put,Req,Res,Param,Body} from '@nestjs/common';
import type {Request,Response} from 'express';
import {PortalService} from './portal.service';
@Controller('api/portal')
export class PortalController {
 constructor(private readonly service:PortalService){}
 @Get('public/:kind') catalog(@Param('kind') kind:string,@Res({passthrough:true}) res:Response){res.setHeader('Cache-Control','public,max-age=60');return this.service.catalog(kind);}
 @Get('public/:kind/:slug') detail(@Param('kind') kind:string,@Param('slug') slug:string,@Res({passthrough:true}) res:Response){res.setHeader('Cache-Control','no-store');return this.service.detail(kind,slug);}
 @Get('admin/documents') admin(@Req() req:Request){return this.service.adminList(req);}
 @Get('admin/:kind/:slug/history') history(@Req() req:Request,@Param('kind') kind:string,@Param('slug') slug:string){return this.service.history(req,kind,slug);}
 @Put('admin/:kind/:slug') save(@Req() req:Request,@Param('kind') kind:string,@Param('slug') slug:string,@Body() body:unknown){return this.service.save(req,kind,slug,body);}
 @Post('admin/:kind/:slug/:action') transition(@Req() req:Request,@Param('kind') kind:string,@Param('slug') slug:string,@Param('action') action:string){return this.service.transition(req,kind,slug,action);}
}
