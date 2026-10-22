import {Body,Controller,Delete,Get,Param,Patch,Post,Req,Query} from '@nestjs/common';
import type {Request} from 'express';
import {HuyenGiaiService} from './huyen-giai.service';
@Controller('api/huyen-giai')
export class HuyenGiaiController{
 constructor(private readonly service:HuyenGiaiService){}
 @Get('status') status(@Req() req:Request){return this.service.status(req);}
 @Get('disclosure/:chartId') disclosure(@Req() req:Request,@Param('chartId') id:string){return this.service.disclosure(req,id);}
 @Get('conversations') list(@Req() req:Request){return this.service.conversations(req);}
 @Get('conversations/:id') history(@Req() req:Request,@Param('id') id:string,@Query('before') before:unknown){return this.service.history(req,id,before);}
 @Delete('conversations/:id') remove(@Req() req:Request,@Param('id') id:string){return this.service.remove(req,id);}
 @Post('feedback/:messageId') feedback(@Req() req:Request,@Param('messageId') id:string,@Body() body:unknown){return this.service.feedback(req,id,body);}
 @Post('generate') generate(@Req() req:Request,@Body() body:unknown){return this.service.generate(req,body);}
 @Get('admin/config') admin(@Req() req:Request){return this.service.admin(req);}
 @Patch('admin/config') configure(@Req() req:Request,@Body() body:unknown){return this.service.configure(req,body);}
}
