import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

const SIDEBAR_ITEMS = [
    { key: 'overview',  icon: '▦',  label: 'Overview'  },
    { key: 'agents',    icon: '🤖', label: 'Agents'    },
    { key: 'transfers', icon: '💸', label: 'Transfers' },
    { key: 'analytics', icon: '📊', label: 'Analytics' },
    { key: 'users',     icon: '👥', label: 'Users'     },
    { key: 'settings',  icon: '⚙️', label: 'Settings'  },
];

const GLOW  = '0 0 10px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.2)';
const GGLOW = '0 0 10px rgba(29,158,117,0.8), 0 0 20px rgba(29,158,117,0.3)';

export default function Admin() {
    const [page, setPage]                   = useState('overview');
    const [transfers, setTransfers]         = useState([]);
    const [filter, setFilter]               = useState('pending');
    const [selected, setSelected]           = useState(null);
    const [currentRate, setCurrentRate]     = useState(null);
    const [newRate, setNewRate]             = useState('');
    const [rateSaving, setRateSaving]       = useState(false);
    const [rateMsg, setRateMsg]             = useState('');
    const [notifications, setNotifications] = useState([]);
    const [showNotifs, setShowNotifs]       = useState(false);
    const [bankAccount, setBankAccount]     = useState(null);
    const [bankForm, setBankForm]           = useState({ account_number: '', account_holder: '' });
    const [bankSaving, setBankSaving]       = useState(false);
    const [bankMsg, setBankMsg]             = useState('');
    const [analytics, setAnalytics]         = useState(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [liquidity, setLiquidity]         = useState(null);
    const [liquidityLoading, setLiquidityLoading] = useState(false);
    const [fraudResults, setFraudResults]   = useState({});
    const [fraudLoading, setFraudLoading]   = useState(null);
    const [accountantReport, setAccountantReport] = useState(null);
    const [accountantLoading, setAccountantLoading] = useState(false);
    const [accountantQuestion, setAccountantQuestion] = useState('');
    const [accountantAnswer, setAccountantAnswer]     = useState('');
    const [accountantAskLoading, setAccountantAskLoading] = useState(false);
    const [agentLogs, setAgentLogs]         = useState({});
    const [agentRunning, setAgentRunning]   = useState({});
    const notifRef                          = useRef(null);
    const navigate                          = useNavigate();

    useEffect(() => {
        fetchTransfers(); fetchRate(); fetchNotifications(); fetchBankAccount(); fetchAnalytics();
        const interval = setInterval(fetchNotifications, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        function handleClick(e) {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    async function fetchTransfers() {
        try { const res = await api.get('/transfers/'); setTransfers(res.data); }
        catch (err) { if (err.response?.status === 401) navigate('/login'); }
    }
    async function fetchRate() {
        try { const res = await api.get('/transfers/rate/'); setCurrentRate(res.data); }
        catch { setCurrentRate(null); }
    }
    async function fetchNotifications() {
        try { const res = await api.get('/transfers/notifications/'); setNotifications(res.data.notifications || []); }
        catch { setNotifications([]); }
    }
    async function fetchBankAccount() {
        try { const res = await api.get('/transfers/bank-account/'); setBankAccount(res.data); }
        catch { setBankAccount(null); }
    }
    async function fetchAnalytics() {
        setAnalyticsLoading(true);
        try { const res = await api.get('/transfers/analytics/'); setAnalytics(res.data); }
        catch { setAnalytics(null); }
        setAnalyticsLoading(false);
    }
    async function fetchLiquidity() {
        setLiquidityLoading(true);
        try { const res = await api.get('/ai/liquidity/'); setLiquidity(res.data); }
        catch { setLiquidity({ status: 'ERROR', advice: 'Could not fetch.' }); }
        setLiquidityLoading(false);
    }
    async function fetchAccountantReport(type = 'summary') {
        setAccountantLoading(true);
        try { const res = await api.post('/ai/accountant/', { report_type: type }); setAccountantReport(res.data); }
        catch { setAccountantReport(null); }
        setAccountantLoading(false);
    }
    async function askAccountant() {
        if (!accountantQuestion.trim()) return;
        setAccountantAskLoading(true);
        try { const res = await api.post('/ai/accountant/', { question: accountantQuestion }); setAccountantAnswer(res.data.report); }
        catch { setAccountantAnswer('Failed to get answer.'); }
        setAccountantAskLoading(false);
    }
    async function saveRate() {
        if (!newRate || isNaN(newRate) || Number(newRate) <= 0) { setRateMsg('Enter a valid rate.'); return; }
        setRateSaving(true); setRateMsg('');
        try { await api.post('/transfers/rate/set/', { gbp_to_sdg: newRate }); setRateMsg('Rate updated.'); setNewRate(''); fetchRate(); }
        catch { setRateMsg('Failed.'); }
        setRateSaving(false);
    }
    async function saveBankAccount() {
        if (!bankForm.account_number || !bankForm.account_holder) { setBankMsg('Both fields required.'); return; }
        if (bankForm.account_number.length !== 7 || !/^\d+$/.test(bankForm.account_number)) { setBankMsg('Must be 7 digits.'); return; }
        setBankSaving(true); setBankMsg('');
        try { await api.post('/transfers/bank-account/set/', bankForm); setBankMsg('Saved.'); setBankForm({ account_number: '', account_holder: '' }); fetchBankAccount(); }
        catch { setBankMsg('Failed.'); }
        setBankSaving(false);
    }
    async function markAllRead() {
        try { await api.post('/transfers/notifications/read-all/'); setNotifications([]); setShowNotifs(false); }
        catch {}
    }
    async function decide(id, status) {
        try { await api.post(`/transfers/${id}/decision/`, { status }); fetchTransfers(); setSelected(null); }
        catch { alert('Failed.'); }
    }
    async function runAgent(agentKey, endpoint) {
        setAgentRunning(r => ({ ...r, [agentKey]: true }));
        const ts = new Date().toLocaleTimeString('en-GB');
        try {
            const res = await api.get(endpoint);
            setAgentLogs(l => ({ ...l, [agentKey]: { status: 'success', summary: summariseAgentResult(agentKey, res.data), ts } }));
        } catch {
            setAgentLogs(l => ({ ...l, [agentKey]: { status: 'error', summary: 'Agent failed.', ts } }));
        }
        setAgentRunning(r => ({ ...r, [agentKey]: false }));
    }
    async function runFraudCheck(id) {
        setFraudLoading(id);
        try { const res = await api.post(`/ai/fraud-check/${id}/`); setFraudResults(r => ({ ...r, [id]: res.data })); }
        catch { setFraudResults(r => ({ ...r, [id]: { risk_level: 'error', explanation: 'Failed.' } })); }
        setFraudLoading(null);
    }
    function summariseAgentResult(key, data) {
        if (key === 'liquidity')  return `Status: ${data.status} | Invested: ${Number(data.total_invested).toLocaleString()} SDG`;
        if (key === 'accountant') return `Revenue: £${data.total_revenue} | Month: £${data.monthly_revenue}`;
        if (key === 'rate')       return `Trend: ${data.trend} | Change: ${data.change_pct}% | Rate: ${data.latest_rate} SDG`;
        return JSON.stringify(data).slice(0, 100);
    }
    function logout() { localStorage.clear(); navigate('/login'); }

    const qm          = analytics?.quick_metrics;
    const unreadCount = notifications.length;
    const counts      = { pending: transfers.filter(t => t.status === 'pending').length, all: transfers.length };
    const filtered    = transfers.filter(t => filter === 'all' ? true : t.status === filter);

    const AGENTS = [
        { key: 'chat',       name: 'Chat Assistant',    icon: '💬', color: '#1D9E75', desc: 'Answers user questions about their account and transfers.',       endpoint: null,               task: 'User Q&A',           activity: 'Handles transfer & investment queries' },
        { key: 'rate',       name: 'Rate Analyst',      icon: '📈', color: '#378ADD', desc: 'Analyses GBP/SDG rate trends and advises on cashout timing.',     endpoint: '/ai/rate-advice/', task: 'Rate Analysis',      activity: `Last rate: ${currentRate?.gbp_to_sdg || '—'} SDG` },
        { key: 'maturity',   name: 'Maturity Advisor',  icon: '🎯', color: '#F59E0B', desc: 'Recommends reinvest or cash out for each Sudan investment.',      endpoint: null,               task: 'Investment Advisory',activity: `${counts.all} investments tracked` },
        { key: 'fraud',      name: 'Fraud Detector',    icon: '🔍', color: '#EF4444', desc: 'Detects suspicious transfers using AI pattern analysis.',         endpoint: null,               task: 'Fraud Detection',    activity: `${counts.pending} pending to analyse` },
        { key: 'liquidity',  name: 'Liquidity Monitor', icon: '💧', color: '#8B5CF6', desc: 'Monitors SDG reserves and warns about cashout risks.',            endpoint: '/ai/liquidity/',   task: 'Liquidity Check',    activity: liquidity ? `Status: ${liquidity.status}` : 'Not run yet' },
        { key: 'accountant', name: 'AI Accountant',     icon: '🧮', color: '#06B6D4', desc: 'Tracks revenue, generates reports, answers finance questions.',  endpoint: '/ai/accountant/',  task: 'Financial Report',   activity: accountantReport ? `Revenue: £${accountantReport.total_revenue}` : 'Not run yet' },
    ];

    return (
        <div style={S.root}>
            {/* ── Sidebar ── */}
            <aside style={S.sidebar}>
                {/* Logo */}
                <div style={S.logoRow}>
                    <div style={S.logoMark}>HL</div>
                    <span style={S.logoText}>HawalaLink</span>
                </div>

                {/* Nav */}
                <p style={S.navSection}>NAVIGATION</p>
                {SIDEBAR_ITEMS.map(item => (
                    <button key={item.key} onClick={() => setPage(item.key)}
                        style={{ ...S.navItem, ...(page === item.key ? S.navItemActive : {}) }}>
                        <span>{item.icon}</span>
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.key === 'transfers' && counts.pending > 0 && (
                            <span style={S.navBadge}>{counts.pending}</span>
                        )}
                    </button>
                ))}

                {/* ── LOGOUT BUTTON ── */}
            <button onClick={logout} style={S.logoutBtn}>
                ⏻ &nbsp;Sign out
            </button>

            <div style={{ flex: 1 }} />

            {/* Admin info */}
            <div style={S.adminRow}>
                <div style={S.adminAvatar}>A</div>
                <div>
                    <p style={S.adminName}>Admin</p>
                    <p style={S.adminSub}>HawalaLink</p>
                </div>
            </div>
            </aside>

            {/* ── Main ── */}
            <div style={S.main}>
                {/* Topbar */}
                <div style={S.topbar}>
                    <div>
                        <h1 style={S.pageTitle}>{SIDEBAR_ITEMS.find(i => i.key === page)?.label}</h1>
                        <p style={S.pageSub}>HawalaLink Admin Panel</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={S.onlinePill}><span style={S.onlineDot} /> Online</div>
                        <div style={{ position: 'relative' }} ref={notifRef}>
                            <button onClick={() => setShowNotifs(v => !v)} style={S.bellBtn}>
                                🔔 {unreadCount > 0 && <span style={S.bellBadge}>{unreadCount}</span>}
                            </button>
                            {showNotifs && (
                                <div style={S.notifPanel}>
                                    <div style={S.notifHead}>
                                        <span style={S.notifHeadTitle}>Notifications</span>
                                        {unreadCount > 0 && <button onClick={markAllRead} style={S.clearBtn}>Clear all</button>}
                                    </div>
                                    {notifications.length === 0
                                        ? <p style={S.notifEmpty}>No new notifications.</p>
                                        : notifications.map(n => (
                                            <div key={n.id} style={S.notifItem}>
                                                <span style={S.notifDot} />
                                                <div>
                                                    <p style={S.notifMsg}>{n.message}</p>
                                                    <p style={S.notifDate}>{new Date(n.created_at).toLocaleDateString('en-GB')}</p>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={S.content}>

                    {/* ── OVERVIEW ── */}
                    {page === 'overview' && (
                        <div>
                            <div style={S.metricsGrid}>
                                {[
                                    { icon: '👥', label: 'Total Users',         value: qm?.total_users     ?? '—', color: '#60A5FA' },
                                    { icon: '⏳', label: 'Pending Transfers',   value: qm?.pending         ?? counts.pending, color: '#FCD34D' },
                                    { icon: '💸', label: 'Total Transfers',     value: qm?.total_transfers ?? counts.all,     color: '#34D399' },
                                    { icon: '❌', label: 'Failed Transactions', value: qm?.failed          ?? '—', color: '#F87171' },
                                ].map(({ icon, label, value, color }) => (
                                    <div key={label} style={S.metricCard}>
                                        <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
                                        <p style={{ ...S.glowText, fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>{label}</p>
                                        <p style={{ fontSize: 32, fontWeight: 800, color, textShadow: `0 0 20px ${color}` }}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div style={S.twoCol}>
                                <div style={S.card}>
                                    <p style={S.cardLabel}>💱 EXCHANGE RATE</p>
                                    <p style={S.cardValue}>{currentRate ? `1 GBP = ${currentRate.gbp_to_sdg} SDG` : 'No rate set'}</p>
                                    <div style={S.inputRow}>
                                        <input type="number" placeholder="New rate" value={newRate} onChange={e => setNewRate(e.target.value)} style={S.darkInput} />
                                        <button onClick={saveRate} style={S.greenBtn} disabled={rateSaving}>{rateSaving ? '...' : 'Set'}</button>
                                    </div>
                                    {rateMsg && <p style={{ fontSize: 12, color: rateMsg.includes('updated') ? '#34D399' : '#F87171', marginTop: 6, fontWeight: 600 }}>{rateMsg}</p>}
                                </div>
                                <div style={S.card}>
                                    <p style={S.cardLabel}>🏦 BANKAK ACCOUNT</p>
                                    <p style={S.cardValue}>{bankAccount ? `${bankAccount.account_number} — ${bankAccount.account_holder}` : 'No account set'}</p>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                        <input type="text" placeholder="7-digit number" value={bankForm.account_number} onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))} style={{ ...S.darkInput, width: 120 }} maxLength={7} />
                                        <input type="text" placeholder="Holder name" value={bankForm.account_holder} onChange={e => setBankForm(f => ({ ...f, account_holder: e.target.value }))} style={{ ...S.darkInput, width: 130 }} />
                                        <button onClick={saveBankAccount} style={S.greenBtn} disabled={bankSaving}>{bankSaving ? '...' : 'Save'}</button>
                                    </div>
                                    {bankMsg && <p style={{ fontSize: 12, color: bankMsg.includes('aved') ? '#34D399' : '#F87171', marginTop: 6, fontWeight: 600 }}>{bankMsg}</p>}
                                </div>
                            </div>

                            <div style={S.card}>
                                <p style={S.cardLabel}>🤖 AI OPERATIONS OVERVIEW</p>
                                <div style={S.opsGrid}>
                                    {[['Total Agents Active','6/6','#34D399'],['Pending',''+counts.pending,'#FCD34D'],['System Health','98%','#34D399'],['Total Requests',''+counts.all,'#60A5FA']].map(([l,v,c]) => (
                                        <div key={l} style={S.opsItem}>
                                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 6 }}>{l}</p>
                                            <p style={{ fontSize: 26, fontWeight: 800, color: c, textShadow: `0 0 15px ${c}` }}>{v}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={S.card}>
                                <p style={S.cardLabel}>📋 RECENT AGENT ACTIVITY LOGS</p>
                                {Object.keys(agentLogs).length === 0
                                    ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No activity yet. Run agents from the Agents tab.</p>
                                    : Object.entries(agentLogs).map(([key, log]) => (
                                        <div key={key} style={S.logRow}>
                                            <div style={{ ...S.logDot, background: log.status === 'success' ? '#34D399' : '#F87171', boxShadow: `0 0 8px ${log.status === 'success' ? '#34D399' : '#F87171'}` }} />
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: 13, color: 'white', fontWeight: 700, textShadow: GLOW }}>{AGENTS.find(a => a.key === key)?.name}</p>
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{log.summary}</p>
                                            </div>
                                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{log.ts}</span>
                                        </div>
                                    ))
                                }
                            </div>
                        </div>
                    )}

                    {/* ── AGENTS ── */}
                    {page === 'agents' && (
                        <div>
                            <div style={S.agentsGrid}>
                                {AGENTS.map(agent => {
                                    const log     = agentLogs[agent.key];
                                    const running = agentRunning[agent.key];
                                    const status  = running ? 'RUNNING' : log ? (log.status === 'success' ? 'ACTIVE' : 'ERROR') : 'IDLE';
                                    const sc      = { RUNNING: '#FCD34D', ACTIVE: '#34D399', ERROR: '#F87171', IDLE: 'rgba(255,255,255,0.3)' };
                                    return (
                                        <div key={agent.key} style={S.agentCard}>
                                            <div style={S.agentTop}>
                                                <div style={{ ...S.agentIcon, background: agent.color + '22', color: agent.color, boxShadow: `0 0 12px ${agent.color}44` }}>{agent.icon}</div>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 14, fontWeight: 700, color: 'white', textShadow: GLOW, marginBottom: 5 }}>{agent.name}</p>
                                                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 700, background: sc[status] + '22', color: sc[status], textShadow: `0 0 8px ${sc[status]}` }}>{status}</span>
                                                </div>
                                            </div>
                                            <div style={{ marginBottom: 8 }}>
                                                <p style={S.agentMetaLabel}>Task</p>
                                                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}><span style={{ color: agent.color }}>●</span> {agent.task}{running && <span style={{ fontSize: 10, color: '#FCD34D', marginLeft: 6 }}>(Processing...)</span>}</p>
                                            </div>
                                            <div style={{ marginBottom: 8 }}>
                                                <p style={S.agentMetaLabel}>Activity</p>
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>• {agent.activity}</p>
                                                {log && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>• {log.summary?.slice(0,55)}...</p>}
                                            </div>
                                            <div style={{ marginBottom: 10 }}>
                                                <p style={S.agentMetaLabel}>Description</p>
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>{agent.desc}</p>
                                            </div>
                                            <div style={S.miniBar}>
                                                {[...Array(14)].map((_, i) => (
                                                    <div key={i} style={{ flex: 1, borderRadius: 2, minHeight: 3, height: `${15 + Math.random() * 35}px`, background: running ? agent.color : agent.color + '50', boxShadow: running ? `0 0 4px ${agent.color}` : 'none' }} />
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                {agent.endpoint
                                                    ? <button onClick={() => runAgent(agent.key, agent.endpoint)} disabled={running} style={{ ...S.runBtn, borderColor: agent.color, color: agent.color, boxShadow: `0 0 8px ${agent.color}44` }}>{running ? '⏸ Running' : '▶ Run'}</button>
                                                    : <button disabled style={{ ...S.runBtn, borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.3)', cursor: 'default' }}>Auto</button>
                                                }
                                                <button style={S.secBtn}>≡ Logs</button>
                                                <button style={S.secBtn} onClick={() => setPage('settings')}>Configure</button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Fraud detector */}
                            <div style={{ ...S.card, marginTop: 20 }}>
                                <p style={S.cardLabel}>🔍 FRAUD DETECTOR — PENDING TRANSFERS</p>
                                {transfers.filter(t => t.status === 'pending').length === 0
                                    ? <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>No pending transfers.</p>
                                    : transfers.filter(t => t.status === 'pending').map(t => {
                                        const r  = fraudResults[t.id];
                                        const rc = { low: '#34D399', medium: '#FCD34D', high: '#F87171' }[r?.risk_level] || 'rgba(255,255,255,0.5)';
                                        return (
                                            <div key={t.id} style={S.fraudRow}>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontSize: 14, color: 'white', fontWeight: 700, textShadow: GLOW }}>{t.user_name} → {t.recipient}</p>
                                                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{Number(t.amount_sdg).toLocaleString()} SDG · {new Date(t.created_at).toLocaleDateString('en-GB')}</p>
                                                    {r && <p style={{ fontSize: 12, color: rc, marginTop: 4, fontWeight: 700, textShadow: `0 0 8px ${rc}` }}>Risk: {r.risk_level?.toUpperCase()} ({r.risk_score}/100) — {r.recommendation?.toUpperCase()}</p>}
                                                </div>
                                                <button onClick={() => runFraudCheck(t.id)} disabled={fraudLoading === t.id} style={{ ...S.runBtn, borderColor: '#F8717180', color: '#F87171' }}>
                                                    {fraudLoading === t.id ? 'Analysing...' : '🔍 Analyse'}
                                                </button>
                                            </div>
                                        );
                                    })
                                }
                            </div>

                            {/* AI Accountant */}
                            <div style={{ ...S.card, marginTop: 16 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                    <p style={S.cardLabel}>🧮 AI ACCOUNTANT</p>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        {['summary','weekly','monthly'].map(t => (
                                            <button key={t} onClick={() => fetchAccountantReport(t)} style={S.outlineBtn} disabled={accountantLoading}>
                                                {t.charAt(0).toUpperCase() + t.slice(1)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {accountantLoading && <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>Generating...</p>}
                                {accountantReport && !accountantLoading && (
                                    <>
                                        <div style={S.accountantMetrics}>
                                            {[['Total Revenue',`£${Number(accountantReport.total_revenue).toFixed(2)}`,'#60A5FA'],['This Month',`£${Number(accountantReport.monthly_revenue).toFixed(2)}`,'#34D399'],['This Week',`£${Number(accountantReport.weekly_revenue).toFixed(2)}`,'#FCD34D'],['Fees',`£${Number(accountantReport.transfer_fees).toFixed(2)}`,'#A78BFA']].map(([l,v,c]) => (
                                                <div key={l} style={S.opsItem}>
                                                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 4 }}>{l}</p>
                                                    <p style={{ fontSize: 18, fontWeight: 800, color: c, textShadow: `0 0 12px ${c}` }}>{v}</p>
                                                </div>
                                            ))}
                                        </div>
                                        <div style={S.reportBox}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{accountantReport.report}</p></div>
                                    </>
                                )}
                                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                    <input type="text" placeholder="Ask a finance question..." value={accountantQuestion} onChange={e => setAccountantQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAccountant()} style={{ ...S.darkInput, flex: 1 }} />
                                    <button onClick={askAccountant} disabled={accountantAskLoading || !accountantQuestion.trim()} style={S.greenBtn}>{accountantAskLoading ? '...' : 'Ask'}</button>
                                </div>
                                {accountantAnswer && <div style={S.reportBox}><p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{accountantAnswer}</p></div>}
                            </div>
                        </div>
                    )}

                    {/* ── TRANSFERS ── */}
                    {page === 'transfers' && (
                        <div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                {[['pending','Pending'],['approved','Approved'],['rejected','Rejected'],['all','All']].map(([k,l]) => (
                                    <button key={k} onClick={() => setFilter(k)} style={{ ...S.filterBtn, ...(filter===k ? S.filterBtnActive : {}) }}>{l}</button>
                                ))}
                            </div>
                            {filtered.length === 0
                                ? <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '3rem' }}>No transfers.</p>
                                : filtered.map(t => (
                                    <div key={t.id} onClick={() => setSelected(t)} style={S.transferRow}>
                                        <div style={S.transferAvatar}>{(t.user_name||'U')[0].toUpperCase()}</div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 14, color: 'white', fontWeight: 700, textShadow: GLOW }}>{t.user_name} → {t.recipient}</p>
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{new Date(t.created_at).toLocaleDateString('en-GB')}</p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ fontSize: 14, color: 'white', fontWeight: 700 }}>{Number(t.amount_sdg).toLocaleString()} SDG</p>
                                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>£{Number(t.amount_gbp||0).toFixed(2)}</p>
                                        </div>
                                        <span style={{ ...S.pill, ...getBadge(t.status) }}>{t.status}</span>
                                    </div>
                                ))
                            }
                            {selected && (
                                <div style={S.modalOverlay}>
                                    <div style={S.modal}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                            <h2 style={{ color: 'white', fontSize: 18, fontWeight: 700, textShadow: GLOW }}>Transfer Details</h2>
                                            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 22, cursor: 'pointer' }}>×</button>
                                        </div>
                                        {[['Customer',selected.user_name],['Email',selected.user_email],['Recipient',selected.recipient],['Amount SDG',Number(selected.amount_sdg).toLocaleString()],['Amount GBP',`£${Number(selected.amount_gbp||0).toFixed(2)}`],['Fee',selected.fee?`£${Number(selected.fee).toFixed(2)}`:'—'],['Total',selected.total_charged?`£${Number(selected.total_charged).toFixed(2)}`:'—'],['Rate',selected.rate_used?`1 GBP = ${selected.rate_used} SDG`:'—'],['Date',new Date(selected.created_at).toLocaleString('en-GB')]].map(([k,v]) => (
                                            <div key={k} style={S.modalRow}>
                                                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{k}</span>
                                                <span style={{ color: 'white', fontSize: 13, fontWeight: 600, textShadow: GLOW }}>{v}</span>
                                            </div>
                                        ))}
                                        {selected.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                                <button onClick={() => decide(selected.id,'approved')} style={S.approveBtn}>✓ Approve</button>
                                                <button onClick={() => decide(selected.id,'rejected')} style={S.rejectBtn}>✕ Reject</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── ANALYTICS ── */}
                    {page === 'analytics' && (
                        <div>
                            {analyticsLoading && <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '3rem' }}>Loading...</p>}
                            {analytics && !analyticsLoading && (
                                <>
                                    <div style={S.metricsGrid}>
                                        {[
                                            { icon: '👥', label: 'Total Users',     value: analytics.quick_metrics.total_users,    color: '#60A5FA' },
                                            { icon: '⏳', label: 'Pending',         value: analytics.quick_metrics.pending,         color: '#FCD34D' },
                                            { icon: '💸', label: 'Transfers',       value: analytics.quick_metrics.total_transfers, color: '#34D399' },
                                            { icon: '❌', label: 'Failed',         value: analytics.quick_metrics.failed,          color: '#F87171' },
                                        ].map(({ icon, label, value, color }) => (
                                            <div key={label} style={S.metricCard}>
                                                <div style={{ fontSize: 32, marginBottom: 8 }}>{icon}</div>
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</p>
                                                <p style={{ fontSize: 28, fontWeight: 800, color, textShadow: `0 0 20px ${color}` }}>{value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={S.twoCol}>
                                        <div style={S.card}>
                                            <p style={S.cardLabel}>💰 Revenue (30 days)</p>
                                            <DarkBarChart data={analytics.revenue_chart} valueKey="revenue" color="#34D399" />
                                        </div>
                                        <div style={S.card}>
                                            <p style={S.cardLabel}>📈 Investments by Status</p>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                                                {Object.entries(analytics.invest_breakdown).map(([status, count]) => {
                                                    const colors = { active: '#34D399', matured: '#FCD34D', cashed_out: 'rgba(255,255,255,0.3)', reinvested: '#60A5FA' };
                                                    const max    = Math.max(...Object.values(analytics.invest_breakdown), 1);
                                                    return (
                                                        <div key={status}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'capitalize' }}>{status.replace('_',' ')}</span>
                                                                <span style={{ fontSize: 12, color: colors[status], fontWeight: 700 }}>{count}</span>
                                                            </div>
                                                            <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                                                                <div style={{ height: '100%', width: `${(count/max)*100}%`, background: colors[status], borderRadius: 3, boxShadow: `0 0 8px ${colors[status]}` }} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={S.twoCol}>
                                        <div style={S.card}>
                                            <p style={S.cardLabel}>👥 User Growth (30 days)</p>
                                            <DarkBarChart data={analytics.user_growth} valueKey="users" color="#60A5FA" />
                                        </div>
                                        <div style={S.card}>
                                            <p style={S.cardLabel}>💸 Transfer Volume SDG</p>
                                            <DarkBarChart data={analytics.transfer_volume} valueKey="volume" color="#FCD34D" />
                                        </div>
                                    </div>
                                </>
                            )}
                            <div style={{ textAlign: 'center', marginTop: 12 }}>
                                <button onClick={fetchAnalytics} style={S.greenBtn} disabled={analyticsLoading}>↻ Refresh</button>
                            </div>
                        </div>
                    )}

                    {/* ── USERS ── */}
                    {page === 'users' && (
                        <div>
                            <div style={S.card}><p style={S.cardLabel}>👥 ALL USERS</p></div>
                            {(() => {
                                const seen = new Set();
                                const unique = transfers.filter(t => { if (seen.has(t.user_email)) return false; seen.add(t.user_email); return true; });
                                return unique.length === 0
                                    ? <p style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '2rem' }}>No users yet.</p>
                                    : unique.map(t => (
                                        <div key={t.user_email} style={S.transferRow}>
                                            <div style={S.transferAvatar}>{(t.user_name||'U')[0].toUpperCase()}</div>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: 14, color: 'white', fontWeight: 700, textShadow: GLOW }}>{t.user_name}</p>
                                                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{t.user_email}</p>
                                            </div>
                                            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{transfers.filter(x => x.user_email === t.user_email).length} transfer(s)</span>
                                        </div>
                                    ));
                            })()}
                        </div>
                    )}

                    {/* ── SETTINGS ── */}
                    {page === 'settings' && (
                        <div>
                            <div style={S.card}>
                                <p style={S.cardLabel}>💱 EXCHANGE RATE</p>
                                <p style={S.cardValue}>{currentRate ? `Current: 1 GBP = ${currentRate.gbp_to_sdg} SDG` : 'No rate set'}</p>
                                <div style={S.inputRow}>
                                    <input type="number" placeholder="New rate (SDG)" value={newRate} onChange={e => setNewRate(e.target.value)} style={S.darkInput} />
                                    <button onClick={saveRate} style={S.greenBtn} disabled={rateSaving}>{rateSaving ? '...' : 'Set Rate'}</button>
                                </div>
                                {rateMsg && <p style={{ fontSize: 12, color: rateMsg.includes('updated') ? '#34D399' : '#F87171', marginTop: 8, fontWeight: 600 }}>{rateMsg}</p>}
                            </div>
                            <div style={S.card}>
                                <p style={S.cardLabel}>🏦 BANKAK ACCOUNT</p>
                                <p style={S.cardValue}>{bankAccount ? `${bankAccount.account_number} — ${bankAccount.account_holder}` : 'No account set'}</p>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    <input type="text" placeholder="7-digit number" value={bankForm.account_number} onChange={e => setBankForm(f => ({ ...f, account_number: e.target.value }))} style={S.darkInput} maxLength={7} />
                                    <input type="text" placeholder="Account holder" value={bankForm.account_holder} onChange={e => setBankForm(f => ({ ...f, account_holder: e.target.value }))} style={S.darkInput} />
                                    <button onClick={saveBankAccount} style={S.greenBtn} disabled={bankSaving}>{bankSaving ? '...' : 'Save'}</button>
                                </div>
                                {bankMsg && <p style={{ fontSize: 12, color: bankMsg.includes('aved') ? '#34D399' : '#F87171', marginTop: 8, fontWeight: 600 }}>{bankMsg}</p>}
                            </div>
                            <div style={S.card}>
                                <p style={S.cardLabel}>💧 LIQUIDITY MONITOR</p>
                                <button onClick={fetchLiquidity} style={S.greenBtn} disabled={liquidityLoading}>{liquidityLoading ? 'Analysing...' : '▶ Run Analysis'}</button>
                                {liquidity && (
                                    <div style={{ ...S.reportBox, marginTop: 12 }}>
                                        <p style={{ fontSize: 13, color: { HEALTHY: '#34D399', WARNING: '#FCD34D', CRITICAL: '#F87171' }[liquidity.status] || 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>{liquidity.advice}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

function DarkBarChart({ data, valueKey, color }) {
    if (!data || data.length === 0) return <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>No data yet.</p>;
    const max = Math.max(...data.map(d => d[valueKey]), 1);
    return (
        <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 72 }}>
                {data.map((d, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div style={{ width: '100%', background: d[valueKey] > 0 ? color : 'rgba(255,255,255,0.05)', borderRadius: '2px 2px 0 0', height: `${Math.max((d[valueKey]/max)*68, d[valueKey]>0?4:2)}px`, boxShadow: d[valueKey] > 0 ? `0 0 6px ${color}88` : 'none' }} />
                    </div>
                ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>30d ago</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Today</span>
            </div>
        </div>
    );
}

function getBadge(status) {
    if (status === 'approved') return { background: 'rgba(52,211,153,0.15)', color: '#34D399', textShadow: '0 0 8px #34D399' };
    if (status === 'rejected') return { background: 'rgba(248,113,113,0.15)', color: '#F87171', textShadow: '0 0 8px #F87171' };
    return { background: 'rgba(252,211,77,0.15)', color: '#FCD34D', textShadow: '0 0 8px #FCD34D' };
}

const S = {
    root:           { display: 'flex', minHeight: '100vh', background: '#1a1f2e', fontFamily: 'system-ui, -apple-system, sans-serif' },
    glowText:       { textShadow: GLOW },

    // Sidebar
    sidebar: { width: 220, background: 'rgba(15,20,30,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '1.5rem 0 1.25rem', position: 'fixed', height: '100vh', zIndex: 10, overflowY: 'auto', overflowX: 'hidden' },
    logoMark:       { width: 34, height: 34, background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', boxShadow: GGLOW },
    logoText:       { fontSize: 15, fontWeight: 800, color: '#1D9E75', textShadow: GGLOW },
    navSection:     { fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: 3, fontWeight: 700, padding: '0 1.25rem', marginBottom: 6 },
    navItem:        { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 1.25rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%', textAlign: 'left', borderLeft: '3px solid transparent' },
    navItemActive:  { background: 'rgba(29,158,117,0.12)', color: '#1D9E75', borderLeft: '3px solid #1D9E75', fontWeight: 700, textShadow: GGLOW },
    navBadge:       { background: '#F59E0B', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 10, padding: '1px 7px', boxShadow: '0 0 8px #F59E0B' },
    adminRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 4, flexShrink: 0 },
    adminAvatar:    { width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', boxShadow: GGLOW, flexShrink: 0 },
    adminName:      { fontSize: 13, fontWeight: 700, color: 'white', textShadow: GLOW },
    adminSub:       { fontSize: 11, color: 'rgba(255,255,255,0.35)', fontWeight: 500 },
    logoutBtn:      { margin: '8px 1rem 12px', flexShrink: 0, padding: '10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, color: '#F87171', fontSize: 13, cursor: 'pointer', fontWeight: 700, textShadow: '0 0 8px #F87171', boxShadow: '0 0 12px rgba(239,68,68,0.15)', letterSpacing: 0.5 },

    // Main
    main:           { flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
    topbar:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 2rem', background: 'rgba(15,20,30,0.8)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 5, backdropFilter: 'blur(12px)' },
    pageTitle:      { fontSize: 24, fontWeight: 800, color: 'white', textShadow: GLOW, margin: 0 },
    pageSub:        { fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, marginTop: 2 },
    onlinePill:     { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)', borderRadius: 20, padding: '4px 12px', fontSize: 12, color: '#34D399', fontWeight: 700, textShadow: '0 0 8px #34D399' },
    onlineDot:      { width: 7, height: 7, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 8px #34D399', display: 'inline-block' },
    bellBtn:        { position: 'relative', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', fontSize: 16, cursor: 'pointer', color: 'white' },
    bellBadge:      { position: 'absolute', top: -4, right: -4, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px #EF4444' },

    notifPanel:     { position: 'absolute', right: 0, top: 48, width: 320, background: 'rgba(20,26,40,0.98)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 200, overflow: 'hidden', backdropFilter: 'blur(12px)' },
    notifHead:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' },
    notifHeadTitle: { fontSize: 13, fontWeight: 700, color: 'white', textShadow: GLOW },
    clearBtn:       { fontSize: 12, color: '#34D399', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 },
    notifEmpty:     { padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 },
    notifItem:      { display: 'flex', gap: 10, padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' },
    notifDot:       { width: 8, height: 8, borderRadius: '50%', background: '#FCD34D', boxShadow: '0 0 8px #FCD34D', marginTop: 4, flexShrink: 0 },
    notifMsg:       { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 },
    notifDate:      { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 3 },

    content:        { padding: '2rem', flex: 1 },

    // Metric cards
    metricsGrid:    { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 },
    metricCard:     { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 18px', boxShadow: '0 2px 20px rgba(0,0,0,0.2)' },

    // Cards
    card:           { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.25rem', marginBottom: 16, boxShadow: '0 2px 20px rgba(0,0,0,0.2)' },
    cardLabel:      { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: 2, marginBottom: 10 },
    cardValue:      { fontSize: 16, color: 'white', fontWeight: 700, textShadow: GLOW, marginBottom: 12 },
    twoCol:         { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 },
    inputRow:       { display: 'flex', gap: 8, alignItems: 'center' },
    darkInput:      { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: 'white', fontSize: 13, outline: 'none', width: 140 },
    greenBtn:       { padding: '8px 18px', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', border: 'none', borderRadius: 8, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 0 12px rgba(29,158,117,0.4)' },
    outlineBtn:     { padding: '6px 12px', background: 'rgba(96,165,250,0.1)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 6, color: '#60A5FA', fontSize: 12, fontWeight: 700, cursor: 'pointer' },

    opsGrid:        { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 4 },
    opsItem:        { background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '14px' },

    logRow:         { display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
    logDot:         { width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0 },

    agentsGrid:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 },
    agentCard:      { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.25rem', boxShadow: '0 2px 20px rgba(0,0,0,0.2)' },
    agentTop:       { display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 },
    agentIcon:      { width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 },
    agentMetaLabel: { fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 4 },
    miniBar:        { display: 'flex', alignItems: 'flex-end', gap: 2, height: 36, margin: '12px 0', background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: 4 },
    runBtn:         { padding: '6px 12px', background: 'none', border: '1px solid', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
    secBtn:         { padding: '6px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, cursor: 'pointer' },

    fraudRow:       { display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '12px', marginBottom: 8 },

    accountantMetrics:{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 },
    reportBox:      { background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '12px 14px', marginTop: 10 },

    filterBtn:      { padding: '8px 18px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    filterBtnActive:{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.4)', color: '#34D399', fontWeight: 700, textShadow: '0 0 8px #34D399' },
    transferRow:    { display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 16px', marginBottom: 8, cursor: 'pointer' },
    transferAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #1D9E75, #0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: 'white', fontWeight: 800, flexShrink: 0, boxShadow: GGLOW },
    pill:           { fontSize: 11, padding: '3px 10px', borderRadius: 10, fontWeight: 700 },

    modalOverlay:   { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' },
    modal:          { background: 'rgba(20,26,40,0.98)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.75rem', width: '100%', maxWidth: 460, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' },
    modalRow:       { display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 10, marginBottom: 10 },
    approveBtn:     { flex: 1, padding: 11, background: 'rgba(52,211,153,0.15)', color: '#34D399', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, fontWeight: 700, cursor: 'pointer', textShadow: '0 0 8px #34D399' },
    rejectBtn:      { flex: 1, padding: 11, background: 'rgba(248,113,113,0.15)', color: '#F87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, fontWeight: 700, cursor: 'pointer', textShadow: '0 0 8px #F87171' },
};
