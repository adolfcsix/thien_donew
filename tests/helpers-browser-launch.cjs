'use strict';
/** Multi-account browser QA must retain browser-context cookie and web-security isolation. */
function browserLaunchOptions(env=process.env){
 const args=env.THIENDO_CHROMIUM_ARGS_JSON?JSON.parse(env.THIENDO_CHROMIUM_ARGS_JSON):['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'];
 if(!Array.isArray(args)||args.length>64||args.some(arg=>typeof arg!=='string'))throw Error('Chromium arguments must be a bounded string array');
 if(args.some(arg=>/^--(?:single-process|disable-web-security|allow-running-insecure-content)(?:=|$)/.test(arg)))throw Error('Unsafe Chromium QA mode: multi-account acceptance requires isolated renderers and web security');
 return {headless:true,...(env.THIENDO_CHROMIUM_PATH?{executablePath:env.THIENDO_CHROMIUM_PATH}:{}),args};
}
module.exports={browserLaunchOptions};
