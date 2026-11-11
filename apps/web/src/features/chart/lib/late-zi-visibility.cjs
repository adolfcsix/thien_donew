'use strict';
/** Research visibility is scoped to the exact result instance, never to the session. */
function isStudyOpenFor(openedFor, result){
 return Boolean(result && result.hour===23 && openedFor===result);
}
function toggleStudyFor(openedFor,result){
 if(!result||result.hour!==23)return null;
 return openedFor===result?null:result;
}
module.exports=Object.freeze({isStudyOpenFor,toggleStudyFor});
