import {Controller,Get,Post,Patch,Param,Query,Req,Body,Res} from '@nestjs/common';
import type {Request,Response} from 'express';
import {VanKhoMediaService} from './van-kho-media.service';
import {VanKhoService} from './van-kho.service';
@Controller('api/van-kho')
export class VanKhoController{
 constructor(private readonly service:VanKhoService,private readonly media:VanKhoMediaService){}
 @Get() list(@Query() q:Record<string,string|undefined>,@Res({passthrough:true}) res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.list(q);}
 @Get('authors') authors(@Res({passthrough:true}) res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.authors();}
 @Get('authors/:id') author(@Param('id') id:string,@Res({passthrough:true}) res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.author(id);}
 @Get('admin/documents') admin(@Req() r:Request){return this.service.adminList(r);}
 @Post('admin/authors') saveAuthor(@Req() r:Request,@Body() b:unknown){return this.service.saveAuthor(r,b);}
 @Patch('admin/authors/:id') updateAuthor(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.saveAuthor(r,b,id);}
 @Post('admin/documents') create(@Req() r:Request,@Body() b:unknown){return this.service.save(r,b);}
 @Patch('admin/documents/:id') edit(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.save(r,b,id);}
 @Get('admin/documents/:id/revisions') revisions(@Req() r:Request,@Param('id') id:string){return this.service.revisions(r,id);}
 @Get('admin/documents/:id/revisions/:version') version(@Req() r:Request,@Param('id') id:string,@Param('version') version:string){return this.service.version(r,id,version);}
 @Get('admin/documents/:id/review-events') reviews(@Req() r:Request,@Param('id') id:string){return this.service.reviews(r,id);}
 @Post('admin/documents/:id/restore/:version') restore(@Req() r:Request,@Param('id') id:string,@Param('version') v:string){return this.service.restore(r,id,v);}
 @Get('admin/documents/:id/images') images(@Req() r:Request,@Param('id') id:string){return this.media.list(r,id);}
 @Post('admin/documents/:id/images/:format') imageUpload(@Req() r:Request,@Param('id') id:string,@Param('format') format:string){return this.media.upload(r,id,format);}
 @Post('admin/documents/:id/images/:assetId/verify') verifyImage(@Req() r:Request,@Param('id') id:string,@Param('assetId') assetId:string){return this.media.verify(r,id,assetId);}
 @Get('admin/documents/:id/images/:assetId') imagePreview(@Req() r:Request,@Res() res:Response,@Param('id') id:string,@Param('assetId') assetId:string){return this.media.serve(r,res,id,assetId,true);}
 @Get(':slug/images/:assetId') image(@Req() r:Request,@Res() res:Response,@Param('slug') slug:string,@Param('assetId') assetId:string){return this.media.serve(r,res,slug,assetId,false);}
 @Get('admin/documents/:id/preview') preview(@Req() r:Request,@Param('id') id:string){return this.service.preview(r,id);}
 @Post('admin/documents/:id/submit') submit(@Req() r:Request,@Param('id') id:string){return this.service.transition(r,id,'pending');}
 @Post('admin/documents/:id/approve') approve(@Req() r:Request,@Param('id') id:string){return this.service.transition(r,id,'approved');}
 @Post('admin/documents/:id/publish') publish(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.service.transition(r,id,'published',b);}
 @Post('admin/documents/:id/hide') hide(@Req() r:Request,@Param('id') id:string){return this.service.transition(r,id,'hidden');}
 @Get(':slug') detail(@Param('slug') slug:string,@Res({passthrough:true}) res:Response){res.setHeader('Cache-Control','private, no-store');return this.service.detail(slug);}
}
