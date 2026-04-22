import ChatBubble from '../components/ChatBubble';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export default function Dashboard() {
    const country = localStorage.getItem('country');
    if (country === 'sudan') return <SudanDashboard />;
    return <UKDashboard />;
}

// ── UK Dashboard ──────────────────────────────────────────────────
function UKDashboard() {
    const [view, setView]       = useState('history');
    const [transfers, setTransfers] = useState([]);
    const [form, setForm]       = useState({ recipient: '', amount_sdg: '', note: '' });
    const [receipt, setReceipt] = useState(null);
    const [preview, setPreview] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate              = useNavigate();
    const name                  = localStorage.getItem('name');

    useEffect(() => { fetchTransfers(); }, []);

    async function fetchTransfers() {
        try {
            const res = await api.get('/transfers/');
            setTransfers(res.data);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        }
    }

    function handle(e) {
        const { name, value } = e.target;
        setForm(f => ({ ...f, [name]: value }));
        if (name === 'amount_sdg') fetchPreview(value);
    }

    const fetchPreview = useCallback(async (amount) => {
        if (!amount || isNaN(amount) || Number(amount) <= 0) { setPreview(null); return; }
        setPreviewLoading(true);
        try {
            const res = await api.post('/transfers/rate/preview/', { amount, sender_country: 'uk' });
            setPreview(res.data);
        } catch { setPreview(null); }
        setPreviewLoading(false);
    }, []);

    async function submit(e) {
        e.preventDefault();
        setError(''); setSuccess(''); setLoading(true);
        try {
            const data = new FormData();
            data.append('recipient',  form.recipient);
            data.append('amount_sdg', form.amount_sdg);
            data.append('note',       form.note);
            data.append('receipt',    receipt);
            await api.post('/transfers/send/', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            setSuccess('Transfer submitted! Awaiting admin approval.');
            setForm({ recipient: '', amount_sdg: '', note: '' });
            setReceipt(null); setPreview(null);
            setView('history'); fetchTransfers();
        } catch (err) { setError(err.response?.data?.detail || 'Submission failed.'); }
        setLoading(false);
    }

    function logout() { localStorage.clear(); navigate('/login'); }

    return (
        <div style={S.page}>
            <div style={S.container}>
                <div style={S.header}>
                    <div><span style={S.logo}>HawalaLink</span><span style={S.countryTag}>🇬🇧 UK</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={S.nameTag}>{name}</span>
                        <button onClick={logout} style={S.logoutBtn}>Sign out</button>
                    </div>
                </div>
                <div style={S.tabs}>
                    {[['send','Send money'],['history','My transfers']].map(([k,l]) => (
                        <button key={k} onClick={() => setView(k)} style={{ ...S.tab, ...(view===k ? S.tabActive : {}) }}>{l}</button>
                    ))}
                </div>
                {success && <div style={S.successBox}>{success}</div>}
                {view === 'send' && (
                    <div style={S.card}>
                        <h2 style={S.cardTitle}>Send money to Sudan</h2>
                        <form onSubmit={submit} style={S.form}>
                            <input name="recipient" placeholder="Recipient name in Sudan" value={form.recipient} onChange={handle} style={S.input} required />
                            <input name="amount_sdg" placeholder="Amount (SDG)" value={form.amount_sdg} onChange={handle} style={S.input} type="number" required />
                            {previewLoading && <p style={S.hint}>Calculating...</p>}
                            {preview && !previewLoading && <BreakdownBox preview={preview} isSdg={false} />}
                            <textarea name="note" placeholder="Note (optional)" value={form.note} onChange={handle} style={S.textarea} rows={2} />
                            <input type="file" accept="image/*,.pdf" onChange={e => setReceipt(e.target.files[0])} style={S.input} required />
                            {receipt && <p style={S.hint}>Selected: {receipt.name}</p>}
                            {error && <p style={S.error}>{error}</p>}
                            <button type="submit" style={S.btn} disabled={loading}>{loading ? 'Submitting...' : 'Submit transfer →'}</button>
                        </form>
                    </div>
                )}
                {view === 'history' && (
                    <div>
                        <h2 style={S.cardTitle}>Your transfers</h2>
                        {transfers.length === 0
                            ? <p style={S.empty}>No transfers yet.</p>
                            : transfers.map(t => <UKCard key={t.id} t={t} />)
                        }
                    </div>
                )}
            </div>
            <ChatBubble />
        </div>
    );
}

// ── Sudan Dashboard ───────────────────────────────────────────────
function SudanDashboard() {
    const [view, setView]             = useState('investments');
    const [investments, setInvestments] = useState([]);
    const [currentRate, setCurrentRate] = useState(null);
    const [bankAccount, setBankAccount] = useState(null);
    const [form, setForm]             = useState({ amount_sdg: '', period_months: '' });
    const [error, setError]           = useState('');
    const [success, setSuccess]       = useState('');
    const [newInvestment, setNewInvestment] = useState(null); // just created investment
    const [loading, setLoading]       = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [reinvestId, setReinvestId] = useState(null);
    const [reinvestPeriod, setReinvestPeriod] = useState('');
    const navigate                    = useNavigate();
    const name                        = localStorage.getItem('name');

    useEffect(() => { fetchInvestments(); fetchRate(); fetchBankAccount(); }, []);

    async function fetchInvestments() {
        try {
            const res = await api.get('/transfers/investments/');
            setInvestments(res.data);
        } catch (err) {
            if (err.response?.status === 401) navigate('/login');
        }
    }

    async function fetchRate() {
        try { const res = await api.get('/transfers/rate/'); setCurrentRate(res.data); }
        catch { setCurrentRate(null); }
    }

    async function fetchBankAccount() {
        try { const res = await api.get('/transfers/bank-account/'); setBankAccount(res.data); }
        catch { setBankAccount(null); }
    }

    async function submitInvestment(e) {
        e.preventDefault();
        if (!form.period_months) { setError('Please select a period.'); return; }
        if (Number(form.amount_sdg) <= 5000) { setError('Amount must be greater than the 5,000 SDG service charge.'); return; }
        setError(''); setSuccess(''); setLoading(true);
        try {
            const res = await api.post('/transfers/investments/create/', {
                amount_sdg:    form.amount_sdg,
                period_months: form.period_months,
            });
            setNewInvestment(res.data);
            setSuccess('Investment created successfully!');
            setForm({ amount_sdg: '', period_months: '' });
            setView('investments');
            fetchInvestments();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create investment.');
        }
        setLoading(false);
    }

    async function cashout(id) {
        if (!window.confirm('Cash out this investment at today\'s rate?')) return;
        setActionLoading(id);
        try {
            await api.post(`/transfers/investments/${id}/cashout/`);
            setSuccess('Investment cashed out successfully.');
            fetchInvestments();
        } catch (err) {
            setError(err.response?.data?.error || 'Cashout failed.');
        }
        setActionLoading(null);
    }

    async function reinvest(id) {
        if (!reinvestPeriod) { setError('Select a period to reinvest.'); return; }
        setActionLoading(id);
        try {
            await api.post(`/transfers/investments/${id}/reinvest/`, { period_months: reinvestPeriod });
            setSuccess('Reinvested successfully! A new investment has been created.');
            setReinvestId(null); setReinvestPeriod('');
            fetchInvestments();
        } catch (err) {
            setError(err.response?.data?.error || 'Reinvest failed.');
        }
        setActionLoading(null);
    }

    function logout() { localStorage.clear(); navigate('/login'); }

    const maturedCount  = investments.filter(i => i.status === 'matured').length;
    const totalInvested = investments
        .filter(i => ['active','matured'].includes(i.status))
        .reduce((sum, i) => sum + Number(i.invested_sdg), 0);
    const totalCurrentGbp = investments
        .filter(i => ['active','matured'].includes(i.status) && i.current_gbp_value)
        .reduce((sum, i) => sum + Number(i.current_gbp_value), 0);

    return (
        <div style={S.page}>
            <div style={S.container}>
                <div style={S.header}>
                    <div><span style={S.logo}>HawalaLink</span><span style={S.countryTag}>🇸🇩 Sudan</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={S.nameTag}>{name}</span>
                        <button onClick={logout} style={S.logoutBtn}>Sign out</button>
                    </div>
                </div>

                {/* Summary cards */}
                {investments.length > 0 && (
                    <div style={S.summaryRow}>
                        <div style={S.summaryCard}>
                            <p style={S.summaryLabel}>Total invested</p>
                            <p style={S.summaryValue}>{totalInvested.toLocaleString()} SDG</p>
                        </div>
                        <div style={S.summaryCard}>
                            <p style={S.summaryLabel}>Current GBP value</p>
                            <p style={{ ...S.summaryValue, color: '#1D9E75' }}>£{totalCurrentGbp.toFixed(2)}</p>
                        </div>
                        <div style={S.summaryCard}>
                            <p style={S.summaryLabel}>Matured</p>
                            <p style={{ ...S.summaryValue, color: maturedCount > 0 ? '#BA7517' : '#888' }}>{maturedCount}</p>
                        </div>
                    </div>
                )}

                <div style={S.tabs}>
                    {[['investments','Transfer history'],['new','New Transfer']].map(([k,l]) => (
                        <button key={k} onClick={() => setView(k)} style={{ ...S.tab, ...(view===k ? S.tabActive : {}) }}>{l}</button>
                    ))}
                </div>

                {(success || error) && (
                    <div style={success ? S.successBox : S.errorBox}>
                        {success || error}
                        <button onClick={() => { setSuccess(''); setError(''); }} style={S.dismissX}>×</button>
                    </div>
                )}

                {/* ── Bank account shown after investment created ── */}
                {newInvestment && bankAccount && view === 'investments' && (
                    <BankAccountCard
                        bankAccount={bankAccount}
                        investment={newInvestment}
                        onDismiss={() => setNewInvestment(null)}
                    />
                )}

                {/* ── New Transfer form ── */}
                {view === 'new' && (
                    <div style={S.card}>
                        <h2 style={S.cardTitle}>New Transfer</h2>
                        <div style={S.infoBox}>
                            <p style={S.infoText}>📋 A <strong>5,000 SDG</strong> service charge is deducted upfront. The remainder is your invested amount.</p>
                            {currentRate && <p style={S.infoText}>📈 Current rate: <strong>1 GBP = {currentRate.gbp_to_sdg} SDG</strong></p>}
                        </div>
                        <form onSubmit={submitInvestment} style={S.form}>
                            <div style={{ position: 'relative' }}>
                                <span style={S.currencyLabel}>SDG</span>
                                <input
                                    name="amount_sdg" type="number" placeholder="0"
                                    value={form.amount_sdg}
                                    onChange={e => setForm(f => ({ ...f, amount_sdg: e.target.value }))}
                                    style={{ ...S.input, paddingLeft: 52 }} required
                                />
                            </div>
                            {form.amount_sdg && Number(form.amount_sdg) > 5000 && currentRate && (
                                <div style={S.investPreview}>
                                    <PreviewRow label="You send"            value={`${Number(form.amount_sdg).toLocaleString()} SDG`} />
                                    <PreviewRow label="Service charge"      value="− 5,000 SDG" color="#A32D2D" />
                                    <PreviewRow label="Amount invested"     value={`${(Number(form.amount_sdg) - 5000).toLocaleString()} SDG`} bold />
                                    <div style={S.divider} />
                                    <PreviewRow label="GBP at today's rate" value={`£${((Number(form.amount_sdg) - 5000) / Number(currentRate.gbp_to_sdg)).toFixed(2)}`} color="#1D9E75" bold />
                                    <p style={S.investNote}>This GBP value updates as the rate changes — if SDG weakens you gain more GBP.</p>
                                </div>
                            )}
                            {form.amount_sdg && Number(form.amount_sdg) <= 5000 && (
                                <p style={S.error}>Amount must be greater than 5,000 SDG service charge.</p>
                            )}
                            <div>
                                <p style={S.periodLabel}>Select period</p>
                                <div style={S.periodRow}>
                                    {[['6','6 months'],['9','9 months'],['12','1 year']].map(([val, label]) => (
                                        <button key={val} type="button"
                                            onClick={() => setForm(f => ({ ...f, period_months: val }))}
                                            style={{ ...S.periodBtn, ...(form.period_months===val ? S.periodBtnActive : {}) }}>
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Show bank account on the form too */}
                            {bankAccount && (
                                <div style={S.bankBox}>
                                    <p style={S.bankTitle}>🏦 Send payment to this Bankak account</p>
                                    <div style={S.bankRow}>
                                        <span style={S.bankLabel}>Account number</span>
                                        <span style={S.bankValue}>{bankAccount.account_number}</span>
                                    </div>
                                    <div style={S.bankRow}>
                                        <span style={S.bankLabel}>Account holder</span>
                                        <span style={S.bankValue}>{bankAccount.account_holder}</span>
                                    </div>
                                    <p style={S.bankNote}>Please send the exact amount shown above to this account, then submit your investment.</p>
                                </div>
                            )}
                            {!bankAccount && (
                                <div style={{ ...S.bankBox, background: '#FAEEDA', borderColor: '#f0d49a' }}>
                                    <p style={{ fontSize: 13, color: '#854F0B' }}>⚠️ No bank account set yet. Contact admin before sending money.</p>
                                </div>
                            )}

                            <button type="submit" style={S.btn} disabled={loading}>{loading ? 'Creating...' : 'Create investment →'}</button>
                        </form>
                    </div>
                )}

                {/* ── Investments list ── */}
                {view === 'investments' && (
                    <div>
                        <h2 style={S.cardTitle}>My Transfers</h2>
                        {investments.length === 0
                            ? <p style={S.empty}>No transfers yet. Start one above.</p>
                            : investments.map(inv => (
                                <InvestmentCard
                                    key={inv.id}
                                    inv={inv}
                                    currentRate={currentRate}
                                    bankAccount={bankAccount}
                                    onCashout={() => cashout(inv.id)}
                                    onReinvestOpen={() => { setReinvestId(inv.id); setReinvestPeriod(''); setError(''); }}
                                    onReinvestConfirm={() => reinvest(inv.id)}
                                    reinvestOpen={reinvestId === inv.id}
                                    reinvestPeriod={reinvestPeriod}
                                    setReinvestPeriod={setReinvestPeriod}
                                    onReinvestCancel={() => setReinvestId(null)}
                                    actionLoading={actionLoading === inv.id}
                                />
                            ))
                        }
                    </div>
                )}
            </div>
            <ChatBubble />
        </div>
    );
}

// ── Bank Account Card (shown after investment created) ────────────
function BankAccountCard({ bankAccount, investment, onDismiss }) {
    const [copied, setCopied] = useState(false);

    function copyNumber() {
        navigator.clipboard.writeText(bankAccount.account_number);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div style={S.bankAlertCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <p style={S.bankAlertTitle}>✅ Investment created — now send payment</p>
                <button onClick={onDismiss} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>×</button>
            </div>
            <p style={S.bankAlertSub}>Please send <strong>{Number(investment.amount_sdg).toLocaleString()} SDG</strong> to the following Bankak account:</p>
            <div style={S.bankDetailBox}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div>
                        <p style={S.bankLabel}>Account number</p>
                        <p style={S.bankBigValue}>{bankAccount.account_number}</p>
                    </div>
                    <button onClick={copyNumber} style={S.copyBtn}>
                        {copied ? '✓ Copied' : 'Copy'}
                    </button>
                </div>
                <div style={S.bankDivider} />
                <div style={{ marginTop: 8 }}>
                    <p style={S.bankLabel}>Account holder</p>
                    <p style={S.bankBigValue}>{bankAccount.account_holder}</p>
                </div>
            </div>
            <p style={S.bankAlertNote}>⚠️ Your investment will be activated once admin confirms receipt of payment.</p>
        </div>
    );
}

// ── Investment Card ───────────────────────────────────────────────
function InvestmentCard({ inv, currentRate, bankAccount, onCashout, onReinvestOpen, onReinvestConfirm, reinvestOpen, reinvestPeriod, setReinvestPeriod, onReinvestCancel, actionLoading }) {
    const today    = new Date();
    const dueDate  = inv.due_date ? new Date(inv.due_date) : null;
    const start    = inv.start_date ? new Date(inv.start_date) : null;
    const daysLeft = dueDate ? Math.ceil((dueDate - today) / 86400000) : null;
    const progress = (start && dueDate)
        ? Math.min(100, Math.max(0, Math.round(((today - start) / (dueDate - start)) * 100)))
        : 0;

    const currentGbp = inv.current_gbp_value ? Number(inv.current_gbp_value) : null;
    const lockedGbp  = Number(inv.gbp_at_submission);
    const gainLoss   = currentGbp !== null ? (currentGbp - lockedGbp) : null;
    const isActionable = ['active', 'matured'].includes(inv.status);

    const statusColor = {
        active:     { background: '#EAF3DE', color: '#27500A' },
        matured:    { background: '#FAEEDA', color: '#854F0B' },
        cashed_out: { background: '#f5f4f0', color: '#888' },
        reinvested: { background: '#f0f4ff', color: '#3355AA' },
    }[inv.status] || {};

    return (
        <div style={S.invCard}>
            <div style={S.invTop}>
                <div>
                    <p style={S.invTitle}>Investment #{inv.id}</p>
                    <p style={S.invDate}>Started {new Date(inv.start_date).toLocaleDateString('en-GB')}</p>
                </div>
                <span style={{ ...S.badge, ...statusColor }}>{inv.status.replace('_',' ')}</span>
            </div>

            <div style={S.amountRow}>
                <ABox label="Sent (SDG)"     value={Number(inv.amount_sdg).toLocaleString()} />
                <ABox label="Service charge" value={`− ${Number(inv.service_charge).toLocaleString()} SDG`} bg="#FFF7ED" lc="#854F0B" vc="#854F0B" />
                <ABox label="Invested (SDG)" value={Number(inv.invested_sdg).toLocaleString()} bg="#f0f4ff" lc="#3355AA" vc="#3355AA" />
            </div>

            <div style={{ ...S.amountRow, marginTop: 6 }}>
                <ABox label="GBP at submission" value={`£${lockedGbp.toFixed(2)}`} />
                {currentGbp !== null && <ABox label="GBP today" value={`£${currentGbp.toFixed(2)}`} bg="#EAF3DE" lc="#3B6D11" vc="#27500A" />}
                {currentRate && <ABox label="Rate today" value={`${currentRate.gbp_to_sdg} SDG`} />}
            </div>

            {gainLoss !== null && (
                <div style={{ ...S.gainBox, background: gainLoss >= 0 ? '#EAF3DE' : '#FCEBEB' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: gainLoss >= 0 ? '#27500A' : '#A32D2D' }}>
                        {gainLoss >= 0 ? '▲' : '▼'} £{Math.abs(gainLoss).toFixed(4)} {gainLoss >= 0 ? 'gain' : 'loss'} vs submission rate
                    </span>
                </div>
            )}

            {inv.status !== 'cashed_out' && inv.status !== 'reinvested' && (
                <div style={S.periodInfo}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={S.periodInfoLabel}>{inv.period_months}-month plan</span>
                        <span style={{ ...S.periodInfoLabel, color: daysLeft <= 10 ? '#A32D2D' : '#555' }}>
                            {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                                : daysLeft === 0 ? '🎉 Due today' : '🎉 Matured'}
                        </span>
                    </div>
                    <div style={S.progressTrack}><div style={{ ...S.progressFill, width: `${progress}%` }} /></div>
                    {dueDate && <p style={S.dueDateText}>Due: {dueDate.toLocaleDateString('en-GB')}</p>}
                </div>
            )}

            {/* Bank account on each active investment card */}
            {inv.status === 'active' && bankAccount && (
                <div style={{ ...S.bankBox, marginTop: 10 }}>
                    <p style={S.bankTitle}>🏦 Bankak payment details</p>
                    <div style={S.bankRow}>
                        <span style={S.bankLabel}>Account number</span>
                        <span style={S.bankValue}>{bankAccount.account_number}</span>
                    </div>
                    <div style={S.bankRow}>
                        <span style={S.bankLabel}>Account holder</span>
                        <span style={S.bankValue}>{bankAccount.account_holder}</span>
                    </div>
                </div>
            )}

            {inv.status === 'cashed_out' && inv.gbp_at_maturity && (
                <div style={S.closedBox}>
                    <p style={S.closedText}>Cashed out at 1 GBP = {inv.rate_at_maturity} SDG</p>
                    <p style={S.closedText}>Final GBP: <strong>£{Number(inv.gbp_at_maturity).toFixed(2)}</strong>
                        {inv.gain_loss_gbp && (
                            <span style={{ color: Number(inv.gain_loss_gbp) >= 0 ? '#27500A' : '#A32D2D', marginLeft: 8 }}>
                                ({Number(inv.gain_loss_gbp) >= 0 ? '+' : ''}£{Number(inv.gain_loss_gbp).toFixed(4)})
                            </span>
                        )}
                    </p>
                </div>
            )}

            {isActionable && (
                <div style={{ marginTop: 12 }}>
                    {!reinvestOpen ? (
                        <div style={S.actionRow}>
                            <button onClick={onCashout} disabled={actionLoading} style={{ ...S.cashoutBtn, opacity: actionLoading ? 0.6 : 1 }}>
                                {actionLoading ? '...' : '💵 Cash out'}
                            </button>
                            <button onClick={onReinvestOpen} disabled={actionLoading} style={{ ...S.reinvestBtn, opacity: actionLoading ? 0.6 : 1 }}>
                                🔄 Reinvest
                            </button>
                        </div>
                    ) : (
                        <div style={S.reinvestPanel}>
                            <p style={S.periodLabel}>Reinvest for how long?</p>
                            <div style={S.periodRow}>
                                {[['6','6 mo'],['9','9 mo'],['12','1 yr']].map(([val, label]) => (
                                    <button key={val} type="button" onClick={() => setReinvestPeriod(val)}
                                        style={{ ...S.periodBtn, ...(reinvestPeriod===val ? S.periodBtnActive : {}) }}>
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                                <button onClick={onReinvestConfirm} disabled={actionLoading || !reinvestPeriod}
                                    style={{ ...S.reinvestBtn, flex: 1, opacity: (!reinvestPeriod || actionLoading) ? 0.6 : 1 }}>
                                    {actionLoading ? 'Reinvesting...' : 'Confirm reinvest'}
                                </button>
                                <button onClick={onReinvestCancel} style={S.cancelBtn}>Cancel</button>
                            </div>
                            <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>No service charge on reinvestment — full amount rolls over.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── UK Transfer Card ──────────────────────────────────────────────
function UKCard({ t }) {
    return (
        <div style={S.invCard}>
            <div style={S.invTop}>
                <div>
                    <p style={S.invTitle}>To: {t.recipient}</p>
                    <p style={S.invDate}>{new Date(t.created_at).toLocaleDateString('en-GB')}</p>
                </div>
                <span style={{ ...S.badge, ...badgeColor(t.status) }}>{t.status}</span>
            </div>
            <div style={S.amountRow}>
                <ABox label="SDG" value={Number(t.amount_sdg).toLocaleString()} />
                {t.fee && <ABox label="Fee" value={`£${Number(t.fee).toFixed(2)}`} bg="#FFF7ED" lc="#854F0B" vc="#854F0B" />}
                {t.status === 'approved' && <ABox label="Total GBP" value={`£${Number(t.total_charged).toFixed(2)}`} bg="#EAF3DE" lc="#3B6D11" vc="#27500A" />}
            </div>
            {t.status === 'pending' && <p style={S.pendingNote}>Awaiting admin approval.</p>}
        </div>
    );
}

// ── Helpers ───────────────────────────────────────────────────────
function BreakdownBox({ preview, isSdg }) {
    const fmt = v => isSdg ? `${Number(v).toLocaleString()} SDG` : `£${v}`;
    return (
        <div style={S.breakdownBox}>
            {[
                ['Amount',         fmt(preview.send_amount)],
                ['Service fee',    fmt(preview.fee)],
                ['Total charged',  fmt(preview.total_charged), true],
                ['Rate',           `1 GBP = ${preview.rate} SDG`],
                ['Recipient gets', isSdg ? `£${preview.recipient_gets}` : `${Number(preview.recipient_gets).toLocaleString()} SDG`, false, true],
            ].map(([label, value, bold, highlight]) => (
                <div key={label} style={S.bRow}>
                    <span style={{ ...S.bLabel, ...(bold ? { fontWeight: 600, color: '#27500A' } : {}) }}>{label}</span>
                    <span style={{ ...S.bVal, ...(bold ? { fontWeight: 700, color: '#27500A' } : {}), ...(highlight ? { color: '#1D9E75', fontWeight: 600 } : {}) }}>{value}</span>
                </div>
            ))}
        </div>
    );
}

function PreviewRow({ label, value, bold, color }) {
    return (
        <div style={S.bRow}>
            <span style={{ ...S.bLabel, ...(bold ? { fontWeight: 600 } : {}) }}>{label}</span>
            <span style={{ ...S.bVal, ...(bold ? { fontWeight: 700 } : {}), ...(color ? { color } : {}) }}>{value}</span>
        </div>
    );
}

function ABox({ label, value, bg, lc, vc }) {
    return (
        <div style={{ ...S.aBox, background: bg || '#f5f4f0' }}>
            <p style={{ ...S.aLabel, color: lc || '#888' }}>{label}</p>
            <p style={{ ...S.aValue, color: vc || '#222' }}>{value}</p>
        </div>
    );
}

function badgeColor(status) {
    if (status === 'approved') return { background: '#EAF3DE', color: '#3B6D11' };
    if (status === 'rejected') return { background: '#FCEBEB', color: '#A32D2D' };
    return { background: '#FAEEDA', color: '#854F0B' };
}

// ── Styles ────────────────────────────────────────────────────────
const S = {
    page:           { minHeight: '100vh', background: '#f5f4f0', padding: '1rem' },
    container:      { maxWidth: 560, margin: '0 auto' },
    header:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
    logo:           { fontSize: 20, fontWeight: 600, color: '#1D9E75' },
    countryTag:     { fontSize: 12, marginLeft: 8, color: '#888' },
    nameTag:        { fontSize: 13, color: '#888' },
    logoutBtn:      { fontSize: 13, padding: '5px 10px', border: '1px solid #e0e0e0', borderRadius: 6, background: 'white', cursor: 'pointer' },
    summaryRow:     { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: '1.25rem' },
    summaryCard:    { background: 'white', borderRadius: 10, padding: 12, border: '1px solid #e0e0e0' },
    summaryLabel:   { fontSize: 11, color: '#888', marginBottom: 4 },
    summaryValue:   { fontSize: 20, fontWeight: 600, color: '#222' },
    tabs:           { display: 'flex', gap: 4, background: 'white', borderRadius: 10, padding: 4, marginBottom: '1.25rem', border: '1px solid #e0e0e0' },
    tab:            { flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', fontSize: 14, fontWeight: 500, background: 'transparent', color: '#888', cursor: 'pointer' },
    tabActive:      { background: '#1D9E75', color: 'white' },
    card:           { background: 'white', borderRadius: 16, padding: '1.5rem', border: '1px solid #e0e0e0' },
    cardTitle:      { fontSize: 17, fontWeight: 500, marginBottom: '1rem', color: '#222' },
    form:           { display: 'flex', flexDirection: 'column', gap: 12 },
    input:          { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, width: '100%', boxSizing: 'border-box' },
    textarea:       { padding: '10px 12px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 14, resize: 'none' },
    btn:            { padding: 12, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 500, cursor: 'pointer' },
    hint:           { fontSize: 12, color: '#0F6E56' },
    error:          { color: '#A32D2D', background: '#FCEBEB', padding: '8px 12px', borderRadius: 8, fontSize: 13 },
    errorBox:       { background: '#FCEBEB', color: '#A32D2D', padding: '10px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 14, display: 'flex', justifyContent: 'space-between' },
    successBox:     { background: '#EAF3DE', color: '#27500A', padding: '10px 14px', borderRadius: 10, marginBottom: '1rem', fontSize: 14, display: 'flex', justifyContent: 'space-between' },
    dismissX:       { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'inherit' },
    empty:          { color: '#888', textAlign: 'center', marginTop: '2rem' },
    currencyLabel:  { position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#888', fontWeight: 500, pointerEvents: 'none' },
    infoBox:        { background: '#f0f4ff', borderRadius: 10, padding: '12px 14px', marginBottom: 12 },
    infoText:       { fontSize: 13, color: '#3355AA', marginBottom: 4 },
    investPreview:  { background: '#EAF3DE', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 5 },
    investNote:     { fontSize: 11, color: '#3B6D11', marginTop: 4 },
    divider:        { height: 1, background: '#c8e0b8', margin: '4px 0' },
    periodLabel:    { fontSize: 13, color: '#555', marginBottom: 8, fontWeight: 500 },
    periodRow:      { display: 'flex', gap: 8 },
    periodBtn:      { flex: 1, padding: '10px 0', border: '2px solid #e0e0e0', borderRadius: 10, fontSize: 14, fontWeight: 500, background: 'white', color: '#888', cursor: 'pointer' },
    periodBtnActive:{ border: '2px solid #1D9E75', background: '#EAF3DE', color: '#1D9E75' },

    // Bank account styles
    bankBox:        { background: '#f0f9f4', border: '1px solid #b2dcc7', borderRadius: 10, padding: '12px 14px' },
    bankTitle:      { fontSize: 13, fontWeight: 600, color: '#0F6E56', marginBottom: 8 },
    bankRow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    bankLabel:      { fontSize: 12, color: '#888' },
    bankValue:      { fontSize: 14, fontWeight: 600, color: '#222', letterSpacing: 1 },
    bankNote:       { fontSize: 11, color: '#555', marginTop: 8 },
    bankAlertCard:  { background: '#f0f9f4', border: '2px solid #1D9E75', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' },
    bankAlertTitle: { fontSize: 15, fontWeight: 600, color: '#0F6E56' },
    bankAlertSub:   { fontSize: 13, color: '#222', marginBottom: 12 },
    bankDetailBox:  { background: 'white', borderRadius: 10, padding: '14px', border: '1px solid #b2dcc7', marginBottom: 10 },
    bankBigValue:   { fontSize: 20, fontWeight: 700, color: '#222', letterSpacing: 2, marginTop: 2 },
    bankDivider:    { height: 1, background: '#e0f0e8' },
    copyBtn:        { padding: '6px 14px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer' },
    bankAlertNote:  { fontSize: 12, color: '#854F0B', background: '#FAEEDA', padding: '8px 10px', borderRadius: 6 },

    invCard:        { background: 'white', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: 10, border: '1px solid #e0e0e0' },
    invTop:         { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    invTitle:       { fontWeight: 500, fontSize: 15, color: '#222' },
    invDate:        { fontSize: 12, color: '#888', marginTop: 2 },
    badge:          { fontSize: 12, padding: '3px 10px', borderRadius: 6, fontWeight: 500 },
    amountRow:      { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
    aBox:           { borderRadius: 8, padding: '7px 12px', flexShrink: 0 },
    aLabel:         { fontSize: 11 },
    aValue:         { fontSize: 15, fontWeight: 500 },
    gainBox:        { borderRadius: 8, padding: '6px 12px', marginTop: 6, marginBottom: 4 },
    periodInfo:     { background: '#f5f4f0', borderRadius: 8, padding: '10px 12px', marginTop: 8 },
    periodInfoLabel:{ fontSize: 12, color: '#555', fontWeight: 500 },
    progressTrack:  { height: 6, background: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
    progressFill:   { height: '100%', background: '#1D9E75', borderRadius: 3, transition: 'width 0.3s' },
    dueDateText:    { fontSize: 11, color: '#888', marginTop: 4 },
    closedBox:      { background: '#f5f4f0', borderRadius: 8, padding: '10px 12px', marginTop: 8 },
    closedText:     { fontSize: 13, color: '#555', marginBottom: 2 },
    actionRow:      { display: 'flex', gap: 8 },
    cashoutBtn:     { flex: 1, padding: 10, background: '#EAF3DE', color: '#27500A', border: '1px solid #c8e0b8', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: 13 },
    reinvestBtn:    { flex: 1, padding: 10, background: '#1D9E75', color: 'white', border: 'none', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: 13 },
    cancelBtn:      { padding: '10px 16px', background: '#f5f4f0', color: '#555', border: '1px solid #e0e0e0', borderRadius: 10, fontWeight: 500, cursor: 'pointer', fontSize: 13 },
    reinvestPanel:  { background: '#f5f4f0', borderRadius: 10, padding: '12px' },
    breakdownBox:   { background: '#EAF3DE', borderRadius: 10, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
    bRow:           { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    bLabel:         { fontSize: 13, color: '#3B6D11' },
    bVal:           { fontSize: 13, color: '#27500A' },
    pendingNote:    { fontSize: 12, color: '#888', marginTop: 6, background: '#f5f4f0', padding: '6px 10px', borderRadius: 6 },
};
