import type {AiStatus,Answer,Conversation,Disclosure,History} from './types';
const object = (value:unknown):value is Record<string,unknown> => !!value && typeof value==='object' && !Array.isArray(value);
const text = (value:unknown):value is string => typeof value==='string';
const texts = (value:unknown):value is string[] => Array.isArray(value) && value.every(text);
const id = (value:unknown):value is string => text(value) && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value);
const fingerprint = (value:unknown) => value===undefined || (text(value)&&/^[a-f0-9]{64}$/i.test(value));
const countOptional = (value:unknown) => value===undefined || (Number.isSafeInteger(value)&&Number(value)>=0);
const date = (value:unknown) => text(value) && Number.isFinite(Date.parse(value));
const mode = (value:unknown) => value==='basic'||value==='expert';
function conversation(value:unknown):value is Conversation {
  return object(value)&&id(value.id)&&(value.chartId===null||id(value.chartId))&&mode(value.mode)&&text(value.topic)&&
    Number.isSafeInteger(value.turns)&&Number(value.turns)>=0&&date(value.updatedAt);
}
function answer(value:unknown):value is Answer {
  return object(value)&&text(value.summary)&&texts(value.missingData)&&Array.isArray(value.findings)&&value.findings.every(finding =>
    object(finding)&&['supportive','challenging','uncertain'].includes(String(finding.kind))&&text(finding.text)&&texts(finding.evidenceIds));
}
export function checked<T>(value:unknown,valid:(value:unknown)=>boolean):T {
  if (!valid(value)) throw new Error('Phản hồi dữ liệu AI không hợp lệ. Hãy tải lại lịch sử trước khi gửi tiếp.');
  return value as T;
}
export function statusResponse(value:unknown):value is AiStatus {
  return object(value)&&object(value.ai)&&typeof value.ai.enabled==='boolean'&&text(value.ai.model)&&text(value.ai.disclaimer)&&
    object(value.limits)&&Number.isSafeInteger(value.limits.dailyUserCalls)&&Number(value.limits.dailyUserCalls)>=0&&countOptional(value.limits.usedToday)&&countOptional(value.limits.remainingToday);
}
export function listResponse(value:unknown):value is {conversations:Conversation[]} {
  return object(value)&&Array.isArray(value.conversations)&&value.conversations.length<=50&&value.conversations.every(conversation);
}
export function historyResponse(value:unknown,expectedId:string):value is History {
  if (!object(value)||!object(value.conversation)) return false;
  const row=value.conversation;
  return row.id===expectedId&&(row.chartId===null||id(row.chartId))&&mode(row.mode)&&text(row.topic)&&
    Array.isArray(value.messages)&&value.messages.length<=80&&value.messages.every(message => object(message)&&id(message.id)&&
      fingerprint(message.factsSha256)&&text(message.question)&&answer(message.response)&&text(message.engineRevision)&&date(message.createdAt))&&
    new Set(value.messages.map(message=>message.id)).size===value.messages.length&&
    (value.nextBefore===undefined||value.nextBefore===null||id(value.nextBefore)&&value.messages.length>0&&value.nextBefore===value.messages[0].id);
}
export function disclosureResponse(value:unknown):value is Disclosure {
  if (!object(value)||!text(value.hash)||!/^[a-f0-9]{64}$/i.test(value.hash)||!object(value.factPack)) return false;
  const pack=value.factPack;
  return pack.discipline==='tu-vi'&&text(pack.ruleSet)&&Array.isArray(pack.houses)&&pack.houses.length===12&&
    new Set(pack.houses.map(house=>object(house)?house.id:null)).size===12&&pack.houses.every(house=>object(house)&&
      text(house.id)&&text(house.palace)&&texts(house.stars)&&texts(house.auxiliary)&&Array.isArray(house.tuHoa)&&
      house.tuHoa.every(item=>object(item)&&text(item.star)&&text(item.name)));
}
export function generationResponse(value:unknown):boolean {
  return object(value)&&id(value.conversationId)&&id(value.answerId)&&fingerprint(value.factsSha256)&&answer(value.answer);
}
