import {Body, Controller, Post, Get, Query, Req, HttpCode} from '@nestjs/common';
import type {Request} from 'express';
import {AdminInsightsService} from './admin-insights.service';
import {TrafficService} from './traffic.service';

@Controller('api/admin/insights')
export class AdminInsightsController {
  constructor(private readonly service:AdminInsightsService) {}
  @Get('dashboard') dashboard(@Req() req:Request,@Query('days') days:unknown) {return this.service.dashboard(req,days);}
  @Post('ask') @HttpCode(200) ask(@Req() req:Request,@Body() body:unknown) {return this.service.ask(req,body);}
}
@Controller('api/analytics')
export class TrafficController {
  constructor(private readonly service:TrafficService) {}
  @Post('page-view') @HttpCode(200) record(@Req() req:Request,@Body() body:unknown) {return this.service.record(req,body);}
}
