import {Controller,Get,Patch,Post,Body,Req,Query,Param,HttpCode} from '@nestjs/common';
import type {Request} from 'express';
import {AdminConsoleService} from './admin-console.service';
@Controller('api/admin/console')
export class AdminConsoleController{
 constructor(private readonly service:AdminConsoleService){}
 @Get('identity') identity(@Req() r:Request){return this.service.identity(r);}
 @Get('session') session(@Req() r:Request){return this.service.session(r);}
 @Patch('profile') profile(@Req() r:Request,@Body() b:unknown){return this.service.profile(r,b);}
 @Get('members') members(@Req() r:Request,@Query() q:Record<string,string>){return this.service.members(r,q);}
 @Get('members/:id') member(@Req() r:Request,@Param('id') id:string){return this.service.member(r,id);}
 @Post('members/:id/revoke-sessions') @HttpCode(200) revoke(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.revokeSessions(r,id,b);}
 @Get('team') team(@Req() r:Request,@Query() q:Record<string,string>){return this.service.members(r,q,true);}
 @Patch('team/:id') permissions(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.team(r,id,b);}
 @Get('posts') posts(@Req() r:Request,@Query() q:Record<string,string>){return this.service.posts(r,q);}
 @Get('posts/:id') post(@Req() r:Request,@Param('id') id:string){return this.service.post(r,id);}
 @Post('posts/:id/:action') @HttpCode(200) transition(@Req() r:Request,@Param('id') id:string,@Param('action') action:string,@Body() b:unknown){return this.service.transition(r,id,action,b);}
 @Get('audit') audit(@Req() r:Request,@Query() q:Record<string,string>){return this.service.audit(r,q);}
}
