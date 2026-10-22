import {Body,Controller,Delete,Get,Param,Patch,Post,Query,Req,Res} from '@nestjs/common';
import type {Request,Response} from 'express';
import {BooksService} from './books.service';
@Controller('api/books')
export class BooksController {
 constructor(private readonly books:BooksService){}
 @Get() catalog(@Req() req:Request,@Query() q:Record<string,string|undefined>){return this.books.catalog(req,q);}
 @Get('admin/catalog') adminList(@Req() req:Request){return this.books.adminList(req);}
 @Post('admin') save(@Req() req:Request,@Body() body:unknown){return this.books.save(req,body);}
 @Patch('admin/:id') update(@Req() req:Request,@Param('id') id:string,@Body() body:unknown){return this.books.save(req,body,id);}
 @Delete('admin/:id') hide(@Req() req:Request,@Param('id') id:string){return this.books.remove(req,id);}
 @Post('admin/:id/assets/:kind/:format') upload(@Req() req:Request,@Param('id') id:string,@Param('kind') kind:string,@Param('format') format:string){return this.books.upload(req,id,kind,format);}
 @Get('expert/mine') expertList(@Req() r:Request){return this.books.expertList(r);}
 @Post('expert') expertCreate(@Req() r:Request,@Body() b:unknown){return this.books.save(r,b,undefined,true);}
 @Patch('expert/:id') expertUpdate(@Req() r:Request,@Param('id') id:string,@Body() b:unknown){return this.books.save(r,b,id,true);}
 @Post('expert/:id/submit') expertSubmit(@Req() r:Request,@Param('id') id:string){return this.books.expertSubmit(r,id);}
 @Post('expert/:id/assets/:kind/:format') expertUpload(@Req() r:Request,@Param('id') id:string,@Param('kind') kind:string,@Param('format') format:string){return this.books.upload(r,id,kind,format,true);}
 @Get(':slug') detail(@Req() req:Request,@Param('slug') slug:string){return this.books.detail(req,slug);}
 @Get(':slug/file') file(@Req() req:Request,@Res() res:Response,@Param('slug') slug:string){return this.books.serve(req,res,slug,'book');}
 @Get(':slug/cover') cover(@Req() req:Request,@Res() res:Response,@Param('slug') slug:string){return this.books.serve(req,res,slug,'cover');}
 @Get(':slug/chapters') chapters(@Req() req:Request,@Param('slug') slug:string){return this.books.chapters(req,slug);}
 @Get(':slug/chapters/:index') chapter(@Req() req:Request,@Param('slug') slug:string,@Param('index') index:string){return this.books.chapter(req,slug,index);}
 @Post(':slug/open') open(@Req() req:Request,@Param('slug') slug:string){return this.books.read(req,slug);}
 @Patch(':slug/progress') progress(@Req() req:Request,@Param('slug') slug:string,@Body() body:unknown){return this.books.progress(req,slug,body);}
}
