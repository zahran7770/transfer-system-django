import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

export default function Register() {
    const [form, setForm]   = useState({ name: '', email: '', password: '', confirm: '', country: 'uk' });
    const [error, setError] = useState('');
    const navigate          = useNavigate();

    function handle(e) { setForm(f => ({ ...f, [e.target.name]: e.target.value })); }

    async function submit(e) {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirm) { setError('Passwords do not match.'); return; }
        try {
            await api.post('/users/register/', {
                name:     form.name,
                email:    form.email,
                password: form.password,
                role:     'customer',
                country:  form.country,
            });
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.email?.[0] || 'Registration failed.');
        }
    }

    return (
        <div style={styles.page}>
            <div style={styles.card}>
                <h1 style={styles.logo}>HawalaLink</h1>
                <p style={styles.sub}>Create your account</p>
                <form onSubmit={submit} style={styles.form}>
                    <input name="name"     type="text"     placeholder="Full name" value={form.name}     onChange={handle} style={styles.input} required />
                    <input name="email"    type="email"    placeholder="Email"     value={form.email}    onChange={handle} style={styles.input} required />
                    <input name="password" type="password" placeholder="Password"  value={form.password} onChange={handle} style={styles.input} required />
                    <input name="confirm"  type="password" placeholder="Confirm password" value={form.confirm} onChange={handle} style={styles.input} required />
                    <div style={styles.countryRow}>
                        <button type="button" onClick={() => setForm(f => ({ ...f, country: 'uk' }))}
                            style={{ ...styles.countryBtn, ...(form.country === 'uk' ? styles.countryActive : {}) }}>
                            🇬🇧 United Kingdom
                        </button>
                        <button type="button" onClick={() => setForm(f => ({ ...f, country: 'sudan' }))}
                            style={{ ...styles.countryBtn, ...(form.country === 'sudan' ? styles.countryActive : {}) }}>
                            🇸🇩 Sudan
                        </button>
                    </div>
                    {error && <p style={styles.error}>{error}</p>}
                    <button type="submit" style={styles.btn}>Create account</button>
                </form>
                <p style={styles.link}>Already have an account? <Link to="/login">Sign in</Link></p>
            </div>
        </div>
    );
}

const styles = {
    page:         { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f4f0' },
    card:         { background: 'white', padding: '2rem', borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' },
    logo:         { fontSize: 24, fontWeight: 600, color: '#1D9E75', textAlign: 'center', margin: 0 },
    sub:          { textAlign: 'center', color: '#888', fontSize: 13, marginBottom: '1.5rem' },
    form:         { display: 'flex', flexDirection: 'column', gap: 12 },
    input:        { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14 },
    countryRow:   { display: 'flex', gap: 8 },
    countryBtn:   { flex: 1, padding: '10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, background: 'white', cursor: 'pointer', color: '#888' },
    countryActive:{ border: '2px solid #1D9E75', color: '#1D9E75', fontWeight: 500 },
    btn:          { padding: 12, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
    error:        { color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8, fontSize: 13 },
    link:         { textAlign: 'center', fontSize: 13, marginTop: '1rem', color: '#888' },
};