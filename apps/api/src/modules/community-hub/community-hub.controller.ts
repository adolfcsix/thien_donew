import {Body,Controller,Get,Param,Patch,Post,Query,Req} from '@nestjs/common';
import type {Request} from 'express';
import {CommunityHubService} from './community-hub.service';
@Controller('api/community')
export class CommunityHubController {
 constructor(private readonly hub:CommunityHubService){}
 @Get('identity') mine(@Req() r:Request){return this.hub.mine(r);}
 @Get('identity/:id') identity(@Req() r:Request,@Param('id') id:string){return this.hub.identity(r,id);}
 @Get('conversations') list(@Req() r:Request,@Query('offset') offset?:string){return this.hub.conversations(r,offset);}
 @Post('conversations/:peer') open(@Req() r:Request,@Param('peer') peer:string){return this.hub.open(r,peer);}
 @Get('conversations/:id/messages') messages(@Req() r:Request,@Param('id') id:string,@Query('before') before?:string){return this.hub.messages(r,id,before);}
 @Post('conversations/:id/messages') send(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.send(r,id,b);}
 @Patch('conversations/:id/read') read(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.read(r,id,b);}
 @Patch('blocks/:id') block(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.block(r,id,b);}
 @Post('reports/:id') report(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.report(r,id,b);}
 @Get('advanced-research') advanced(@Req() r:Request){return this.hub.advanced(r);}
 @Get('premium-sections') sections(@Req() r:Request){return this.hub.sections(r);}
 @Get('premium-access') access(@Req() r:Request,@Query('path') path:string){return this.hub.assertSection(r,path);}
}
@Controller('api/admin/console')
export class CommunityAdminController {
 constructor(private readonly hub:CommunityHubService){}
 @Patch('members/:id/expert') expert(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.expert(r,id,b);}
 @Post('pro/:id/gift') gift(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.gift(r,id,b);}
 @Patch('premium-sections') sections(@Req() r:Request,@Body() b:unknown){return this.hub.sectionConfig(r,b);}
 @Get('message-reports') reports(@Req() r:Request){return this.hub.reports(r);}
 @Post('message-reports/:id/resolve') resolve(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.hub.resolveReport(r,id,b);}
}
