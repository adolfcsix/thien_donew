/** Presentation-only catalog. Never used as a role or entitlement. */
declare const specialtyBadges:ReadonlyArray<{
 readonly id:string;
 readonly name:string;
 readonly subject:string;
 readonly symbol:string;
 readonly tone:'amber'|'violet'|'jade'|'copper'|'azure';
 readonly description:string;
}>;
export = specialtyBadges;
