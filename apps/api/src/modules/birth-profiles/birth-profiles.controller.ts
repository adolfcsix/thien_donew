import {Body,Controller,Delete,Get,HttpCode,HttpStatus,Param,Patch,Post,Req} from '@nestjs/common';
import type {Request} from 'express';
import {BirthProfilesService} from './birth-profiles.service';
@Controller('api/birth-profiles')
export class BirthProfilesController {
 constructor(private readonly service:BirthProfilesService){}
 @Get() list(@Req() req:Request){return this.service.list(req);}
 @Get(':id') get(@Req() req:Request,@Param('id') id:string){return this.service.get(req,id);}
 @Post() @HttpCode(HttpStatus.CREATED) create(@Req() req:Request,@Body() body:unknown){return this.service.create(req,body);}
 @Patch(':id') update(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.service.update(req,id,body);}
 @Delete(':id') remove(@Req() req:Request,@Param('id') id:string){return this.service.remove(req,id);}
}
