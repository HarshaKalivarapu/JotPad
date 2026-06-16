import { useState } from 'react'
import { supabase } from '../supabase'

function Login() {
    const [email, setEmail] = useState('')
    // 'idle' | 'sending' | 'sent' | 'error'
    const [status, setStatus] = useState('idle')
    const [errorMsg, setErrorMsg] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setStatus('sending')
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
        })
        if (error) {
            setStatus('error')
            setErrorMsg(error.message)
        } else {
            setStatus('sent')
        }
    }

    return (
        <div className="login-screen">
            <h1>JotPad</h1>
            {status === 'sent' ? (
                <p className="login-message">Check your email — we sent you a sign-in link.</p>
            ) : (
                <form onSubmit={handleSubmit} className="login-form">
                    <p>Sign in with a magic link</p>
                    <input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                    />
                    <button type="submit" disabled={status === 'sending'}>
                        {status === 'sending' ? 'Sending…' : 'Send link'}
                    </button>
                    {status === 'error' && <p className="login-error">{errorMsg}</p>}
                </form>
            )}
        </div>
    )
}

export default Login
