/** Unsent text and retry receipts live only in this account's mounted inbox. */
type Submission = { body: string; id: string };
export class ConversationDrafts {
  private entries = new Map<string, { body: string; submission?: Submission }>();
  read(conversation: string) { return this.entries.get(conversation)?.body || ''; }
  edit(conversation: string, body: string) {
    if (!body) { this.entries.delete(conversation); return; }
    const previous = this.entries.get(conversation)?.submission;
    this.entries.set(conversation, { body, submission: previous?.body === body.trim() ? previous : undefined });
  }
  submit(conversation: string, createId: () => string): Submission | null {
    const draft = this.entries.get(conversation);
    const body = draft?.body.trim();
    if (!draft || !body) return null;
    const submission = draft.submission?.body === body ? draft.submission : { body, id: createId() };
    this.entries.set(conversation, { ...draft, submission });
    return submission;
  }
  acknowledge(conversation: string, submissionId: string) {
    if (this.entries.get(conversation)?.submission?.id === submissionId) this.entries.delete(conversation);
  }
}

/** The latest server window must not discard pages the reader already loaded. */
export function mergeMessageWindow<T extends { messages: { id: string }[]; nextBefore: string | null }>(previous: T | null, latest: T): T {
  const first = latest.messages[0];
  const older = previous?.messages.filter(message => first && BigInt(message.id) < BigInt(first.id)) || [];
  return { ...latest, messages: [...older, ...latest.messages], nextBefore: older.length ? previous!.nextBefore : latest.nextBefore };
}

/** One ordering domain for polling, send refreshes, successes and errors. */
export class LatestRequest {
  private revision=0;
  begin(){return ++this.revision;}
  current(){return this.revision;}
  invalidate(){++this.revision;}
  isCurrent(ticket:number,signal?:AbortSignal){return ticket===this.revision&&!signal?.aborted;}
}

type ConversationSnapshot={id:string;updatedAt:string;latestMessageId:string;unread:number;readCount:number;name?:string;metadataOrder?:number};
/** Message and read counts are monotone under the participant API (no hard delete).
 * Combining the two watermarks also covers a new message racing a read receipt.
 * updatedAt alone cannot order reads, and JS dates lose SQL sub-ms precision. */
export function mergeConversationPage<T extends ConversationSnapshot>(previous:T[],incoming:T[]):T[]{
 const records=new Map(previous.map(c=>[c.id,c]));
 for(const next of incoming){
  const old=records.get(next.id);
  if(!old){records.set(next.id,next);continue;}
  const newer=BigInt(next.latestMessageId||'0')>BigInt(old.latestMessageId||'0')||
   (next.latestMessageId===old.latestMessageId&&next.updatedAt>old.updatedAt);
  const readCount=Math.max(old.readCount,next.readCount);
  const receivedCount=Math.max(old.readCount+old.unread,next.readCount+next.unread);
  const metadata=(next.metadataOrder??0)>=(old.metadataOrder??0)?next:old;
  records.set(next.id,{...(newer?next:old),...(metadata.name===undefined?{}:{name:metadata.name}),metadataOrder:metadata.metadataOrder,readCount,unread:Math.max(0,receivedCount-readCount)});
 }
 return [...records.values()].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
}
