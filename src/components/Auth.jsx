import React from 'react'
import { signInWithGoogle } from '../firebase'

export default function Auth(){
  const onGoogle = async () => {
    try{
      await signInWithGoogle()
    }catch(e){
      console.error('Google sign-in failed', e)
      alert('Google sign-in failed: ' + e.message)
    }
  }

  return (
    <div className="login-screen">
      <h2>Welcome to ChatApp</h2>
      <p>Please sign in to continue. Use Google to sign in.</p>

      <div style={{display:'flex',gap:8,justifyContent:'center'}}>
        <button onClick={onGoogle}>Sign in with Google</button>
      </div>

      <p style={{marginTop:12,fontSize:12,color:'#666'}}>Note: enable Google sign-in in your Firebase console for Google auth to work.</p>
    </div>
  )
}
