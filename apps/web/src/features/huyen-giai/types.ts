export type Finding = {kind:'supportive'|'challenging'|'uncertain';text:string;evidenceIds:string[]};
export type Answer = {summary:string;findings:Finding[];missingData:string[]};
export type Message = {factsSha256?:string;id:string;question:string;response:Answer;engineRevision:string;createdAt:string};
export type Conversation = {id:string;chartId:string|null;mode:'basic'|'expert';topic:string;turns:number;updatedAt:string};
export type History = {conversation:Pick<Conversation,'id'|'chartId'|'mode'|'topic'>;messages:Message[];nextBefore?:string|null};
export type AiStatus = {ai:{enabled:boolean;model:string;disclaimer:string};limits:{dailyUserCalls:number;usedToday?:number;remainingToday?:number;resetTimeZone?:string}};
export type Disclosure = {factPack:{discipline:string;ruleSet:string;houses:Array<{id:string;palace:string;stars:string[];auxiliary:string[];tuHoa:Array<{star:string;name:string}>}>};hash:string};
