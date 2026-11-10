import { withSupabase } from "npm:@supabase/server@1";

// A server-only, authenticated staff provisioning endpoint. The admin secret
// is provided to the trusted Supabase runtime and never sent to the browser.
type SevenRole = "supervisor"|"director"|"manager"|"reception"|"housekeeping"|"accountant";
const ALLOWED: ReadonlySet<string> = new Set(["supervisor","director","manager","reception","housekeeping","accountant"]);
const STAFF: ReadonlySet<string> = new Set(["reception","housekeeping","accountant"]);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL=/^[^\s@]{1,100}@[^\s@]{1,100}\.[^\s@]{2,40}$/;

const reply=(data:Record<string,unknown>,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});

export default {
 fetch: withSupabase({auth:"user"},async(req,ctx)=>{
  if(req.method!=="POST")return reply({ok:false,error:"method_not_allowed"},405);
  const actor=ctx.userClaims?.id;
  if(!actor)return reply({ok:false,error:"not_authenticated"},401);
  let body:Record<string,unknown>;
  try{body=await req.json();}catch{return reply({ok:false,error:"invalid_json"},400);}
  if(!body||typeof body!=="object")return reply({ok:false,error:"invalid_input"},400);
  const email=String(body.email||"").trim().toLowerCase();
  const fullName=String(body.full_name||"").trim();
  const role=String(body.role||"") as SevenRole;
  const hotelId=body.hotel_id==null?null:String(body.hotel_id);
  const password=typeof body.password==="string"?body.password:"";
  if(!EMAIL.test(email)||email.length>200||fullName.length<2||fullName.length>160||
     !ALLOWED.has(role)||password.length<12||password.length>128||
     /^\s|\s$/.test(password)||!/[a-z]/i.test(password)||!/[0-9]/.test(password)||
     !/[^A-Za-z0-9]/.test(password))
     return reply({ok:false,error:"invalid_input_or_weak_password"},422);
  const {data:assigned,error:roleError}=await ctx.supabase.from("seven_roles")
   .select("role,hotel_id").eq("user_id",actor).eq("active",true);
  if(roleError||!assigned?.length)return reply({ok:false,error:"forbidden"},403);
  const supervisor=assigned.some(x=>x.role==="supervisor");
  const director=assigned.some(x=>x.role==="director");
  const managerHotels=new Set(assigned.filter(x=>x.role==="manager"&&x.hotel_id).map(x=>x.hotel_id));
  const isGlobal=role==="supervisor"||role==="director";
  if(isGlobal&&hotelId!==null)return reply({ok:false,error:"global_role_has_no_hotel"},422);
  if(!isGlobal&&(!hotelId||!UUID.test(hotelId)))return reply({ok:false,error:"hotel_required"},422);
  const canCreate=supervisor||(director&&role!=="supervisor")||
    (STAFF.has(role)&&!!hotelId&&managerHotels.has(hotelId));
  if(!canCreate)return reply({ok:false,error:"forbidden"},403);
  if(hotelId){
   const {data:hotel,error:hotelError}=await ctx.supabase.from("hotels")
    .select("id").eq("id",hotelId).maybeSingle();
   if(hotelError||!hotel)return reply({ok:false,error:"invalid_hotel"},422);
  }
  // Do not invite or send an activation email; the manager defines credentials.
  const created=await ctx.supabaseAdmin.auth.admin.createUser({
   email,password,email_confirm:true,user_metadata:{full_name:fullName}
  });
  if(created.error||!created.data?.user?.id){
   console.error("Seven staff createUser failed",created.error?.code||"unknown");
   return reply({ok:false,error:"account_creation_failed_or_exists"},409);
  }
  const userId=created.data.user.id;
  const {error:accessError}=await ctx.supabase.from("seven_roles").insert({
   user_id:userId,hotel_id:isGlobal?null:hotelId,role,full_name:fullName,active:true
  });
  if(accessError){
   console.error("Seven staff role assignment failed",accessError.code||"unknown");
   // Only this *newly created* user can be removed safely.
   const cleanup=await ctx.supabaseAdmin.auth.admin.deleteUser(userId);
   if(cleanup.error)console.error("Seven staff cleanup failed",cleanup.error.code||"unknown");
   return reply({ok:false,error:"role_assignment_failed"},409);
  }
  return reply({ok:true,email,role,hotel_id:isGlobal?null:hotelId},201);
 })
};
