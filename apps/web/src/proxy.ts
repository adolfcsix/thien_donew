import {NextRequest,NextResponse} from 'next/server';
import {isSourcePath} from './lib/source-exposure.cjs';
export function proxy(request:NextRequest){
 if(isSourcePath(request.nextUrl.pathname))return new NextResponse(null,{status:404,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 return NextResponse.next();
}
