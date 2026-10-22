/** Presentation only: retain archived algorithm/version identifiers in stored data. */
export function publicStudyTags(tags:readonly string[]){return tags.filter(tag=>!/^\s*[Vv]\d+(?:\.\d+){1,5}\s*$/.test(tag));}
export function publicStudyText(text:string){return text.replace(/\b[Vv]\d+(?:\.\d+){1,5}(?:\s*[:·—-]\s*)?/g,'').replace(/ {2,}/g,' ').trim();}
