type Config = {input_price_microusd_per_million:number;output_price_microusd_per_million:number};
declare const c: {
 input(raw:unknown):{chartId:string;conversationId:string|null;question:string;mode:'basic'|'expert';topic:string};
 factualPack(raw:unknown):{facts:{discipline:string;ruleSet:string;menh:string;than:string;cuc:string;houses:Array<{id:string;palace:string;branch:string;stars:string[];auxiliary:string[];tuHoa:Array<{star:string;name:string}>}>};digest:string;validIds:string[]};
 result(raw:string,validIds:string[]):{summary:string;findings:Array<{kind:'supportive'|'challenging'|'uncertain';text:string;evidenceIds:string[]}>;missingData:string[]};
 costMicro(inputTokens:number,outputTokens:number,config:Config):number;
 prompt(facts:unknown,request:unknown,previous:unknown):{systemInstruction:{parts:Array<{text:string}>};contents:Array<{role:string;parts:Array<{text:string}>}>};
};
export = c;
