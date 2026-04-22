import { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

export default function ChatBubble() {
    const [open, setOpen]         = useState(false);
    const [messages, setMessages] = useState([
        { role: 'assistant', content: 'Hi! I\'m your HawalaLink assistant. Ask me anything about your transfers, investments, or the current rate.' }
    ]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const bottomRef               = useRef(null);

    useEffect(() => {
        if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, open]);

    async function send() {
        const message = input.trim();
        if (!message || loading) return;
        const newMessages = [...messages, { role: 'user', content: message }];
        setMessages(newMessages);
        setInput('');
        setLoading(true);
        try {
            const history = newMessages.slice(1, -1);
            const res = await api.post('/ai/chat/', { message, history });
            setMessages(m => [...m, { role: 'assistant', content: res.data.reply }]);
        } catch {
            setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I couldn\'t connect. Please try again.' }]);
        }
        setLoading(false);
    }

    function handleKey(e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    }

    return (
        <div style={S.wrapper}>
            {open && (
                <div style={S.panel}>
                    <div style={S.panelHeader}>
                        <div style={S.headerLeft}>
                            <div style={S.avatar}>AI</div>
                            <div>
                                <p style={S.headerTitle}>HawalaLink Assistant</p>
                                <p style={S.headerSub}>Powered by Claude</p>
                            </div>
                        </div>
                        <button onClick={() => setOpen(false)} style={S.closeBtn}>×</button>
                    </div>
                    <div style={S.messages}>
                        {messages.map((m, i) => (
                            <div key={i} style={{ ...S.msgRow, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                <div style={{ ...S.bubble, ...(m.role === 'user' ? S.userBubble : S.aiBubble) }}>
                                    {m.content}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div style={{ ...S.msgRow, justifyContent: 'flex-start' }}>
                                <div style={{ ...S.bubble, ...S.aiBubble, color: '#aaa' }}>Thinking...</div>
                            </div>
                        )}
                        <div ref={bottomRef} />
                    </div>
                    <div style={S.inputRow}>
                        <textarea
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Ask anything about your account..."
                            style={S.input}
                            rows={1}
                        />
                        <button onClick={send} disabled={loading || !input.trim()} style={S.sendBtn}>➤</button>
                    </div>
                </div>
            )}
            <button onClick={() => setOpen(v => !v)} style={S.fab}>
                {open ? '×' : '💬'}
            </button>
        </div>
    );
}

const S = {
    wrapper:     { position: 'fixed', bottom: 24, right: 24, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 },
    fab:         { width: 52, height: 52, borderRadius: '50%', background: '#1D9E75', color: 'white', border: 'none', fontSize: 22, cursor: 'pointer', boxShadow: '0 4px 16px rgba(29,158,117,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    panel:       { width: 320, height: 440, background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid #e0e0e0' },
    panelHeader: { background: '#1D9E75', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    headerLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
    avatar:      { width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.3)', color: 'white', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 14, fontWeight: 600, color: 'white', margin: 0 },
    headerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: 0 },
    closeBtn:    { background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' },
    messages:    { flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 },
    msgRow:      { display: 'flex' },
    bubble:      { maxWidth: '80%', padding: '8px 12px', borderRadius: 12, fontSize: 13, lineHeight: 1.5 },
    aiBubble:    { background: '#f5f4f0', color: '#222', borderBottomLeftRadius: 4 },
    userBubble:  { background: '#1D9E75', color: 'white', borderBottomRightRadius: 4 },
    inputRow:    { display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid #f0f0f0', alignItems: 'flex-end' },
    input:       { flex: 1, padding: '8px 10px', border: '1px solid #e0e0e0', borderRadius: 8, fontSize: 13, resize: 'none', fontFamily: 'inherit', outline: 'none' },
    sendBtn:     { padding: '8px 12px', background: '#1D9E75', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 16 },
};
