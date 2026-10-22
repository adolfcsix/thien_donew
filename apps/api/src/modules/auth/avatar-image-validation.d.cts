export type AvatarInspection = {mime:'image/jpeg'|'image/png'|'image/webp'; width:number; height:number};
export function inspectAvatar(data:unknown, contentType:unknown): AvatarInspection|null;
