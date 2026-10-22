import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,Res} from '@nestjs/common';
import type {Request,Response} from 'express';
import {ForumService} from './forum.service';
import {ForumModerationService} from './forum-moderation.service';
@Controller('api/forum')
export class ForumController {
 constructor(private readonly forum:ForumService,private readonly moderation:ForumModerationService){}
 @Get('categories') categories(){return this.forum.categories();}
 @Get('threads') threads(@Req() req:Request,@Query() q:Record<string,string|undefined>){return this.forum.list(req,q);}
 @Get('mine') mine(@Req() req:Request){return this.forum.myPosts(req);}
 @Get('mine/moderated') moderatedMine(@Req() req:Request){return this.forum.moderatedMine(req);}
 @Get('bookmarks') bookmarks(@Req() req:Request){return this.forum.bookmarks(req);}
 @Get('notifications') notifications(@Req() req:Request){return this.forum.notifications(req);}
 @Patch('notifications/:id/seen') seen(@Req() req:Request,@Param('id') id:string){return this.forum.seen(req,id);}
 @Get('members/:id') member(@Req() req:Request,@Param('id') id:string){return this.forum.profile(req,id);}
 @Post('media') imageUpload(@Req() req:Request){return this.forum.uploadImage(req);}
 @Get('threads/:id/image') image(@Req() req:Request,@Param('id') id:string,@Res() res:Response){return this.forum.image(req,id,res);}
 @Post('threads') create(@Req() req:Request,@Body() body:unknown){return this.forum.create(req,body);}
 @Get('threads/:id/comments') comments(@Req() req:Request,@Param('id') id:string,@Query('offset') offset?:string){return this.forum.moreComments(req,id,offset);}
 @Get('threads/:id') detail(@Req() req:Request,@Param('id') id:string){return this.forum.detail(req,id);}
 @Patch('threads/:id') edit(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.forum.update(req,id,body);}
 @Delete('threads/:id') remove(@Req() req:Request,@Param('id') id:string){return this.forum.remove(req,id);}
 @Post('threads/:id/comments') comment(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.forum.comment(req,id,body);}
 @Patch('comments/:id') editComment(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.forum.editComment(req,id,body);}
 @Delete('comments/:id') deleteComment(@Req() req:Request,@Param('id') id:string){return this.forum.deleteComment(req,id);}
 @Post('threads/:id/bookmark') bookmark(@Req() req:Request,@Param('id') id:string){return this.forum.toggle(req,id,'bookmark');}
 @Post('threads/:id/follow') follow(@Req() req:Request,@Param('id') id:string){return this.forum.toggle(req,id,'follow');}
 @Post('threads/:id/like') like(@Req() req:Request,@Param('id') id:string){return this.forum.toggle(req,id,'like');}
 @Post('comments/:id/helpful') helpful(@Req() req:Request,@Param('id') id:string){return this.forum.toggle(req,id,'helpful','comment');}
 @Post('reports/threads/:id') reportThread(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.report(req,'thread',id,body);}
 @Post('reports/comments/:id') reportComment(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.report(req,'comment',id,body);}
 @Post('appeals/threads/:id') appealThread(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.appeal(req,'thread',id,body);}
 @Post('appeals/comments/:id') appealComment(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.appeal(req,'comment',id,body);}
 @Get('moderation/queue') queue(@Req() req:Request){return this.moderation.queue(req);}
 @Post('moderation/reports/:id/inspect') inspect(@Req() req:Request,@Param('id') id:string){return this.moderation.inspectReport(req,id);}
 @Get('moderation/audit') audit(@Req() req:Request){return this.moderation.audit(req);}
 @Patch('moderation/reports/:id') reportState(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.changeReport(req,id,body);}
 @Post('moderation/threads/:id') moderateThread(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.act(req,'thread',id,body);}
 @Post('moderation/comments/:id') moderateComment(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.act(req,'comment',id,body);}
 @Post('moderation/members/:id') sanction(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.sanction(req,id,body);}
 @Post('moderation/appeals/:id') decide(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.appealDecision(req,id,body);}
 @Post('moderation/tinh-van/:id') award(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.moderation.award(req,id,body);}
}
