import { Controller, Get, Post, Patch, Delete, Param, Req, Body, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request } from 'express';
import { StudyService } from './study.service';

@Controller('api/study')
export class StudyController {
  constructor(private readonly service: StudyService) {}
  @Get() list(@Req() req: Request) { return this.service.list(req); }
  @Get(':id') get(@Req() req: Request, @Param('id') id:string) { return this.service.get(req,id); }
  @Post('import') @HttpCode(HttpStatus.CREATED) importBackup(@Req() req: Request, @Body() body: unknown) { return this.service.importBackup(req,body); }
  @Get('import/:id') importStatus(@Req() req: Request, @Param('id') id:string) { return this.service.importStatus(req,id); }
  @Post() @HttpCode(HttpStatus.CREATED) create(@Req() req: Request, @Body() body: unknown) { return this.service.create(req,body); }
  @Patch(':id') update(@Req() req: Request, @Param('id') id:string,@Body() body:unknown) { return this.service.update(req,id,body); }
  @Delete(':id') remove(@Req() req: Request, @Param('id') id:string) { return this.service.remove(req,id); }
}
