"use client";
import {FormEvent,useState} from "react";
import Link from "next/link";
import styles from "./entrar.module.css";

export default function Entrar(){
 const[email,setEmail]=useState(""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[sent,setSent]=useState(false);
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setBusy(true);setMessage("");
  try{
   const res=await fetch("/api/auth/magic-link",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email}),cache:"no-store"});
   const result=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(result.message||"Não foi possível enviar o link.");
   setMessage(result.message);setSent(true);
  }catch(err){setMessage(err instanceof Error?err.message:"Não foi possível enviar o link.")}finally{setBusy(false)}
 };
 return <main className={styles.page}><section className={styles.card}><span>ÁREA RESERVADA ICE-MZ</span><h1>Entrar sem palavra-passe</h1><p>Introduza um dos e-mails autorizados. Enviaremos um link seguro e de utilização única.</p><form onSubmit={submit}><label>E-mail autorizado<input type="email" value={email} onChange={e=>{setEmail(e.target.value);setSent(false);setMessage("")}} placeholder="nome@exemplo.com" required/></label>{message&&<p className={sent?styles.success:styles.error}>{message}</p>}<button disabled={busy}>{busy?"A enviar…":"Enviar link de acesso →"}</button></form><small>Contas autorizadas: Administrador e Visualizador. O link confirma a propriedade do e-mail.</small><Link href="/#gestao">← Voltar ao portal</Link></section></main>;
}
