import {NextResponse} from "next/server";

const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://strffffxecbnwkeqgttd.supabase.co";
const publishableKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||"sb_publishable_J0oSYK9JSvBWI-54AY0_uA_YD-3AcOq";
const allowed=new Set(["sergiom.ndimande@gmail.com","gitondimas@gmail.com"]);

export async function POST(request:Request){
 try{
  const input=await request.json();
  const email=String(input.email||"").trim().toLowerCase();
  if(!allowed.has(email))return NextResponse.json({message:"Este e-mail não está autorizado para a área reservada."},{status:403});
  const origin=new URL(request.url).origin;
  const authRes=await fetch(`${supabaseUrl}/auth/v1/otp`,{
   method:"POST",
   headers:{apikey:publishableKey,"Content-Type":"application/json"},
   body:JSON.stringify({email,create_user:true,data:{full_name:email==="sergiom.ndimande@gmail.com"?"Sergio M. Ndimande":"Gitondimas"},redirect_to:`${origin}/auth/callback`}),
   cache:"no-store"
  });
  const result=await authRes.json().catch(()=>({}));
  if(!authRes.ok){
   const limited=authRes.status===429;
   return NextResponse.json({message:limited?"Aguarde alguns minutos antes de solicitar outro link.":result.msg||result.message||"Não foi possível enviar o link de acesso."},{status:authRes.status});
  }
  return NextResponse.json({message:"Link enviado. Consulte a caixa de entrada e o correio não solicitado."},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({message:"Não foi possível contactar o serviço de autenticação."},{status:500});
 }
}
