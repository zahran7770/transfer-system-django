import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Login() {
    const [form, setForm]   = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const navigate          = useNavigate();

    function handle(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

    async function submit(e) {
        e.preventDefault();
        setError('');
        try {
            const res = await api.post('/users/login/', form);
            localStorage.setItem('access',  res.data.access);
            localStorage.setItem('refresh', res.data.refresh);
            try {
                const me = await api.get('/users/me/');
                localStorage.setItem('role',    me.data.role);
                localStorage.setItem('name',    me.data.name);
                localStorage.setItem('country', me.data.country);
                if (me.data.role === 'admin') {
                    navigate('/admin');
                } else {
                    navigate('/dashboard');
                }
            } catch {
                localStorage.setItem('role', 'customer');
                navigate('/dashboard');
            }
        } catch {
            setError('Invalid email or password.');
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.logo}>HawalaLink</h1>
                <p style={styles.sub}>UK → Sudan Transfers</p>
                <form onSubmit={submit} style={styles.form}>
                    <input name="email"    type="email"    placeholder="Email"    value={form.email}    onChange={handle} style={styles.input} required />
                    <input name="password" type="password" placeholder="Password" value={form.password} onChange={handle} style={styles.input} required />
                    {error && <p style={styles.error}>{error}</p>}
                    <button type="submit" style={styles.btn}>Sign in</button>
                </form>
                <p style={styles.link}>No account? <Link to="/register">Register</Link></p>
            </div>
        </div>
    );
}

const styles = {
    page:  { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0' },
    card:  { background: 'white', padding: '2rem', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' },
    logo:  { fontSize: 24, fontWeight: 600, color: '#1D9E75', textAlign: 'center', margin: 0 },
    sub:   { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: '1.5rem' },
    form:  { display: 'flex', flexDirection: 'column', gap: 12 },
    input: { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 },
    btn:   { padding: 12, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
    error: { color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8, fontSize: 13 },
    link:  { textAlign: 'center', fontSize: 13, marginTop: '1rem', color: '#888' },
};