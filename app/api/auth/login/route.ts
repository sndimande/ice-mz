import {NextResponse} from "next/server";

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://strffffxecbnwkeqgttd.supabase.co";
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_J0oSYK9JSvBWI-54AY0_uA_YD-3AcOq";

export async function POST(request:Request){
 try{
  const input=await request.json();
  const email=String(input.email||"").trim().toLowerCase();
  const password=String(input.password||"").normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g,"");
  if(!email||!password)return NextResponse.json({message:"Preencha o e-mail e a palavra-passe."},{status:400});
  const authRes=await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`,{
   method:"POST",headers:{apikey:publishableKey,"Content-Type":"application/json"},
   body:JSON.stringify({email,password}),cache:"no-store"
  });
  const session=await authRes.json().catch(()=>({}));
  if(!authRes.ok)return NextResponse.json({message:session.error_description||session.msg||"E-mail ou palavra-passe incorrectos."},{status:authRes.status});
  const profileRes=await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${session.user.id}&select=role,full_name,active&limit=1`,{
   headers:{apikey:publishableKey,Authorization:`Bearer ${session.access_token}`},cache:"no-store"
  });
  const profiles=await profileRes.json().catch(()=>[]);
  if(!profileRes.ok||!profiles[0]?.active)return NextResponse.json({message:"Conta autenticada, mas sem perfil ICE-MZ activo."},{status:403});
  return NextResponse.json({token:session.access_token,user:session.user,profile:profiles[0]},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({message:"Não foi possível contactar o serviço de autenticação."},{status:500});
 }
}
