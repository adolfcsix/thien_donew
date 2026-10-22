import {Body,Controller,Get,Header,HttpCode,Post,Query,Req} from '@nestjs/common';
import type {Request} from 'express';
import {SecureCalculationsService} from './secure-calculations.service';
@Controller('api/calculations/western')
export class SecureCalculationsController {
 constructor(private readonly service:SecureCalculationsService){}
 @Post('natal') @HttpCode(200) @Header('Cache-Control','private, no-store')
 natal(@Req() req:Request,@Body() body:unknown){return this.service.natal(req,body);}
 @Post('relationship') @HttpCode(200) @Header('Cache-Control','private, no-store')
 relationship(@Req() req:Request,@Body() body:unknown){return this.service.relationship(req,body);}
 @Get('catalog') @Header('Cache-Control','private, no-store')
 catalog(@Req() req:Request,@Query('tab') tab?:string,@Query('index') index?:string){return this.service.catalog(req,tab,index);}
}
