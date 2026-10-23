import { Controller, Get, Post, Patch, Delete, Body, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { ProfileService } from './profile.service';
import { PasswordRecoveryService } from './password-recovery.service';
import { AdminMfaService } from './admin-mfa.service';
import { AccountEmailService } from './account-email.service';
@Controller('api/auth')
export class AuthController {
  constructor(private readonly service: AuthService, private readonly google: GoogleAuthService, private readonly profile: ProfileService, private readonly recovery:PasswordRecoveryService,private readonly mfa:AdminMfaService,private readonly emailService:AccountEmailService) { }
  @Get('me') async me(@Req() req: Request) { return { user: await this.service.me(req) }; }
  @Get('destination') destination(@Req() req: Request) { return this.service.destination(req); }
  @Post('register') async register(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) { res.status(HttpStatus.CREATED); return this.service.register(body, req, res); }
  @Post('login') @HttpCode(200) async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) { return this.service.login(body, req, res); }
  @Post('logout/all') @HttpCode(200) async logoutAll(@Req() req:Request,@Res({passthrough:true}) res:Response) {return this.service.logoutAll(req,res);}
  @Post('logout') @HttpCode(200) async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.service.logout(req, res); }
  @Post('password/forgot') @HttpCode(200) async forgot(@Body() body:unknown) {return this.recovery.request(body);}
  @Post('password/reset') @HttpCode(200) async reset(@Body() body:unknown) {return this.recovery.reset(body);}
  @Post('password') @HttpCode(200) async password(@Req() req: Request, @Body() body: unknown) { return this.service.changePassword(req, body); }
  @Patch('profile') async updateProfile(@Req() req: Request, @Body() body: unknown) { return this.profile.update(req, body); }
  @Get('avatar') async avatar(@Req() req: Request, @Res() res: Response) { return this.profile.avatar(req, res); }
  @Post('avatar') @HttpCode(200) async uploadAvatar(@Req() req: Request) { return this.profile.uploadAvatar(req); }
  @Delete('avatar') async deleteAvatar(@Req() req: Request) { return this.profile.removeAvatar(req); }
  @Get('security/events') securityEvents(@Req() req:Request){return this.service.securityEvents(req);}
  @Get('sessions') sessions(@Req() req:Request){return this.service.sessions(req);}
  @Post('sessions/revoke') @HttpCode(200) revokeSession(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.service.revokeSession(req,res,body);}
  @Post('logout/others') @HttpCode(200) logoutOthers(@Req() req:Request){return this.service.logoutOthers(req);}
  @Get('mfa/status') mfaStatus(@Req() req:Request){return this.mfa.status(req);}
  @Post('mfa/setup') @HttpCode(200) mfaSetup(@Req() req:Request,@Body() body:unknown){return this.mfa.setup(req,body);}
  @Post('mfa/confirm') @HttpCode(200) mfaConfirm(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.mfa.confirm(req,res,body);}
  @Post('mfa/verify') @HttpCode(200) mfaVerify(@Req() req:Request,@Res({passthrough:true}) res:Response,@Body() body:unknown){return this.mfa.verify(req,res,body);}
  @Post('mfa/trusted-session') @HttpCode(200) trustedSession(@Req() req:Request){return this.mfa.restoreTrustedSession(req);}
  @Post('mfa/trusted-devices/revoke') @HttpCode(200) revokeTrustedDevices(@Req() req:Request,@Res({passthrough:true}) res:Response){return this.mfa.revokeTrustedDevices(req,res);}
  @Get('email/status') emailStatus(@Req() req:Request){return this.emailService.status(req);}
  @Post('email/send') @HttpCode(200) emailSend(@Req() req:Request){return this.emailService.send(req);}
  @Post('email/verify') @HttpCode(200) emailVerify(@Req() req:Request,@Body() body:unknown){return this.emailService.verify(req,body);}
  @Get('google/config') googleConfig() { return this.google.config(); }
  @Get('google/nonce') googleNonce(@Res({passthrough:true}) res: Response) { return this.google.nonce(res); }
  @Post('google/start') @HttpCode(200) async googleStart(@Req() req: Request, @Res({passthrough:true}) res: Response, @Body() body: unknown) { return this.google.start(body,req,res); }
  @Post('google/verify') @HttpCode(200) async googleVerify(@Req() req: Request, @Res({passthrough:true}) res: Response, @Body() body: unknown) { return this.google.verify(body,req,res); }
  @Delete('account') async remove(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: unknown) { return this.service.deleteAccount(req, res, body); }
}
