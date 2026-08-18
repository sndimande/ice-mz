"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import styles from "../../entrar/entrar.module.css";

const supabaseUrl="https://strffffxecbnwkeqgttd.supabase.co";
const publishableKey="sb_publishable_J0oSYK9JSvBWI-54AY0_uA_YD-3AcOq";

export default function AuthCallback(){
 const[message,setMessage]=useState("A confirmar o link seguro…"),[ok,setOk]=useState(false);
 useEffect(()=>{(async()=>{
  try{
   const hash=new URLSearchParams(window.location.hash.slice(1)),token=hash.get("access_token")||"";
   if(!token)throw new Error(hash.get("error_description")||"O link é inválido ou expirou.");
   const userRes=await fetch(`${supabaseUrl}/auth/v1/user`,{headers:{apikey:publishableKey,Authorization:`Bearer ${token}`}});
   const user=await userRes.json();
   if(!userRes.ok||!user.id)throw new Error("Não foi possível confirmar o utilizador.");
   const profileRes=await fetch(`${supabaseUrl}/rest/v1/profiles?user_id=eq.${user.id}&select=role,full_name,active&limit=1`,{headers:{apikey:publishableKey,Authorization:`Bearer ${token}`}});
   const profiles=await profileRes.json();
   if(!profileRes.ok||!profiles[0]?.active)throw new Error("Este utilizador não possui um perfil ICE-MZ activo.");
   sessionStorage.setItem("ice-mz-auth",JSON.stringify({token,user,profile:profiles[0]}));
   window.history.replaceState({},document.title,"/auth/callback");
   setOk(true);setMessage("Acesso confirmado. A área reservada já está disponível.");
   setTimeout(()=>window.location.replace("/#gestao"),1200);
  }catch(err){setMessage(err instanceof Error?err.message:"Não foi possível confirmar o acesso.")}
 })()},[]);
 return <main className={styles.page}><section className={styles.card}><span>ÁREA RESERVADA ICE-MZ</span><h1>{ok?"Acesso autorizado":"Confirmação de acesso"}</h1><p className={ok?styles.success:styles.error}>{message}</p><Link href={ok?"/#gestao":"/entrar"}>{ok?"Abrir área reservada →":"Solicitar novo link →"}</Link></section></main>;
}
