import { Controller, Get, Post, Delete, Param, Req, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ChartsService } from './charts.service';
import type { Request } from 'express';
@Controller('api/charts')
export class ChartsController {
  constructor(private readonly service: ChartsService) { }
  @Post('calculate') @HttpCode(200) calculate(@Req() req: Request, @Body() body: unknown) { return this.service.calculateForUser(req, body); }
  @Get() list(@Req() req: Request) { return this.service.list(req); }
  @Post('import') @HttpCode(200) importBackup(@Req() req: Request, @Body() body: unknown) { return this.service.importBackup(req, body); }
  @Post() @HttpCode(HttpStatus.CREATED) save(@Req() req: Request, @Body() body: unknown) { return this.service.save(req, body); }
  @Get(':id') get(@Req() req: Request, @Param('id') id: string) { return this.service.get(req, id); }
  @Delete(':id') remove(@Req() req: Request, @Param('id') id: string) { return this.service.remove(req, id); }
}
