/** UI-only fixtures fake /auth/me and have no SQL cookie. Keep the global admin
 * navigation lookup consistent; never use this helper in real account/API tests. */
export async function mockMemberAccessForUi(context){
 await context.route('**/api/billing/access',route=>{
  if(route.request().method()!=='GET')return route.continue();
  return route.fulfill({json:{isAdmin:false,isOwner:false}});
 });
}
