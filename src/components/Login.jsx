import { useState } from 'react'
import { supabase } from '../supabase'

function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    // 'idle' | 'signing-in' | 'error'
    const [status, setStatus] = useState('idle')
    const [errorMsg, setErrorMsg] = useState('')

    async function handleSubmit(event) {
        event.preventDefault()
        setStatus('signing-in')
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
            setStatus('error')
            setErrorMsg(error.message)
        }
        // On success the auth listener in App.jsx picks it up and renders the app.
    }

    return (
        <div className="login-screen">
            <h1>JotPad</h1>
            <form onSubmit={handleSubmit} className="login-form">
                <p>Sign in</p>
                <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    autoComplete="email"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                />
                <button type="submit" disabled={status === 'signing-in'}>
                    {status === 'signing-in' ? 'Signing in…' : 'Sign in'}
                </button>
                {status === 'error' && <p className="login-error">{errorMsg}</p>}
            </form>
        </div>
    )
}

export default Login
