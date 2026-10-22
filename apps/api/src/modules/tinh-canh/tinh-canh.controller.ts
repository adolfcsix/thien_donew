import {Body,Controller,Get,Param,Patch,Post,Query,Req} from '@nestjs/common';
import type {Request} from 'express';
import {TinhCanhService} from './tinh-canh.service';
@Controller('api/tinh-canh')
export class TinhCanhController {
 constructor(private readonly service:TinhCanhService){}
 @Get('rules') rules(){return this.service.rules();}
 @Get('me') mine(@Req() req:Request){return this.service.mine(req);}
 @Patch('me/privacy') privacy(@Req() req:Request,@Body() body:unknown){return this.service.privacy(req,body);}
 @Get('leaderboard') leaderboard(@Query() q:Record<string,unknown>){return this.service.leaderboard(q);}
 @Get('members/:id') member(@Req() req:Request,@Param('id') id:string){return this.service.profile(req,id);}
 @Get('specialty-badges/catalog') specialtyCatalog(){return this.service.specialtyBadgeCatalog();}
 @Get('admin/specialty-badges') specialtyGrants(@Req() req:Request){return this.service.specialtyBadgeGrants(req);}
 @Post('admin/specialty-badges') grantSpecialty(@Req() req:Request,@Body() body:unknown){return this.service.grantSpecialtyBadge(req,body);}
 @Post('admin/specialty-badges/:id/revoke') revokeSpecialty(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.service.revokeSpecialtyBadge(req,id,body);}
 @Get('admin/audit') audit(@Req() req:Request){return this.service.audit(req);}
 @Get('admin/rank-grants') rankGrants(@Req() req:Request){return this.service.rankGrants(req);}
 @Post('admin/rank-grants') grantRank(@Req() req:Request,@Body() body:unknown){return this.service.grantRank(req,body);}
 @Post('admin/rank-grants/:id/revoke') revokeRank(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.service.revokeRank(req,id,body);}
 @Post('admin/awards') award(@Req() req:Request,@Body() body:unknown){return this.service.award(req,body);}
 @Post('admin/awards/:id/revoke') revoke(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.service.revoke(req,id,body);}
}
