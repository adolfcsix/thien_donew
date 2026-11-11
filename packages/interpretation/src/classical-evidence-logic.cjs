'use strict';
/**
 * Three-valued evidence logic for research criteria.
 * Values are true (verified met), false (verified not met), or null (unknown).
 * Malformed values fail closed to unknown; no inference of source-school parity.
 */
function asKnown(value){
 return value===true||value===false?value:null;
}
function orKnown(...values){
 if(!values.length)return null;
 const known=values.map(asKnown);
 if(known.some(x=>x===true))return true;
 if(known.every(x=>x===false))return false;
 return null;
}
function andKnown(...values){
 if(!values.length)return null;
 const known=values.map(asKnown);
 if(known.some(x=>x===false))return false;
 if(known.every(x=>x===true))return true;
 return null;
}
module.exports=Object.freeze({asKnown,orKnown,andKnown});
