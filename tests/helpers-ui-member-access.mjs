/** UI-only fixtures fake /auth/me and have no SQL cookie. Keep the global admin
 * navigation lookup consistent; never use this helper in real account/API tests. */
export async function mockMemberAccessForUi(context){
 // SaveStudy mounts on the research page and reads saved birth profiles even
 // when the UI-only smoke test never presses Save. The fake /auth/me identity
 // has no real SQL session, so a genuine 401 here would publish the global
 // SESSION_EXPIRED_EVENT and navigate to '/', invalidating UI assertions.
 // Stub only this read, not registration, writes, or API integration tests.
 await context.route('**/api/birth-profiles',route=>{
  if(route.request().method()!=='GET')return route.continue();
  return route.fulfill({status:200,json:{profiles:[]}});
 });
 // In UI-only fixtures, fake /auth/me is not accompanied by a real SQL cookie.
 // Background workspace/history reads must not receive a real 401, which would
 // correctly trigger the app's session-revocation handler and navigate to '/'.
 // Only stub the two *collection GETs*. Test-specific routes registered later
 // have priority and can still return malformed lists, failures, or fixtures.
 // Do not fake writes, item reads, protected admin calls or integration tests.
 await context.route('**/api/study',route=>{
  if(route.request().method()!=='GET')return route.continue();
  return route.fulfill({status:200,json:{entries:[]}});
 });
 await context.route('**/api/charts',route=>{
  if(route.request().method()!=='GET')return route.continue();
  return route.fulfill({status:200,json:{charts:[]}});
 });
 await context.route('**/api/billing/access',route=>{
  if(route.request().method()!=='GET')return route.continue();
  return route.fulfill({json:{isAdmin:false,isOwner:false}});
 });
}
