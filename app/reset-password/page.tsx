"use client";
import {FormEvent,useEffect,useState} from "react";
import Link from "next/link";
import styles from "./reset.module.css";

const supabaseUrl="https://strffffxecbnwkeqgttd.supabase.co";
const publishableKey="sb_publishable_J0oSYK9JSvBWI-54AY0_uA_YD-3AcOq";

export default function ResetPassword(){
 const[token,setToken]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[message,setMessage]=useState(""),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const hash=new URLSearchParams(window.location.hash.slice(1));
  const found=hash.get("access_token")||"";
  setToken(found);
  if(!found)setMessage(hash.get("error_description")||"O link de recuperação é inválido ou expirou. Solicite um novo link.");
 },[]);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setMessage("");
  if(password.length<8)return setMessage("A nova palavra-passe deve ter pelo menos 8 caracteres.");
  if(password!==confirm)return setMessage("As palavras-passe não são iguais.");
  if(!token)return setMessage("O link de recuperação não contém uma sessão válida.");
  setBusy(true);
  try{
   const res=await fetch(`${supabaseUrl}/auth/v1/user`,{method:"PUT",headers:{apikey:publishableKey,Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({password})});
   const result=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(result.msg||result.message||"Não foi possível actualizar a palavra-passe.");
   setDone(true);setPassword("");setConfirm("");window.history.replaceState({},document.title,"/reset-password");
  }catch(err){setMessage(err instanceof Error?err.message:"Não foi possível actualizar a palavra-passe.")}finally{setBusy(false)}
 };
 return <main className={styles.page}><section className={styles.card}><span>ÁREA RESERVADA ICE-MZ</span><h1>Definir nova palavra-passe</h1>{done?<div className={styles.success}><b>Palavra-passe actualizada com sucesso.</b><p>Já pode regressar ao portal e iniciar sessão.</p><Link href="/#gestao">Entrar na área reservada →</Link></div>:<form onSubmit={submit}><label>Nova palavra-passe<input type="password" value={password} onChange={e=>{setPassword(e.target.value);setMessage("")}} minLength={8} required/></label><label>Confirmar palavra-passe<input type="password" value={confirm} onChange={e=>{setConfirm(e.target.value);setMessage("")}} minLength={8} required/></label>{message&&<p className={styles.message}>{message}</p>}<button disabled={busy||!token}>{busy?"A actualizar…":"Guardar nova palavra-passe →"}</button></form>}<Link className={styles.back} href="/">← Voltar ao portal</Link></section></main>;
}
