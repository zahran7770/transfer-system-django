import os
import json
import requests
from django.conf import settings
 
CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL   = "claude-sonnet-4-20250514"
 
 
def _call_claude(system_prompt, user_message, max_tokens=1024):
    api_key = getattr(settings, 'ANTHROPIC_API_KEY', os.environ.get('ANTHROPIC_API_KEY', ''))
    if not api_key:
        return "AI service not configured. Add ANTHROPIC_API_KEY to your .env file."
    headers = {
        "x-api-key":         api_key,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }
    payload = {
        "model":      CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "system":     system_prompt,
        "messages":   [{"role": "user", "content": user_message}],
    }
    try:
        res = requests.post(CLAUDE_API_URL, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        return res.json()["content"][0]["text"]
    except requests.exceptions.Timeout:
        return "The AI service timed out. Please try again."
    except Exception as e:
        return f"AI service error: {str(e)}"
 
 
# ── Agent 1: Chat Assistant ───────────────────────────────────────
 
def chat_assistant(user, question, conversation_history=None):
    from apps.transfers.models import Transfer, Investment, ExchangeRate
 
    transfers   = Transfer.objects.filter(user=user).order_by('-created_at')[:10]
    investments = Investment.objects.filter(user=user).order_by('-created_at')[:10]
    rate_obj    = ExchangeRate.objects.order_by('-updated_at').first()
 
    transfer_summary = "\n".join([
        f"- Transfer #{t.id}: {t.amount_sdg} SDG to {t.recipient}, status={t.status}, date={t.created_at.date()}"
        for t in transfers
    ]) or "No transfers yet."
 
    investment_summary = "\n".join([
        f"- Investment #{i.id}: {i.invested_sdg} SDG, GBP at submission=£{i.gbp_at_submission}, "
        f"period={i.period_months}mo, due={i.due_date}, status={i.status}"
        for i in investments
    ]) or "No investments yet."
 
    current_rate = f"1 GBP = {rate_obj.gbp_to_sdg} SDG" if rate_obj else "No rate set"
 
    system_prompt = f"""You are a helpful assistant for HawalaLink, a UK-Sudan money transfer and investment platform.
You are speaking with {user.name} ({user.email}), a {user.country} user.
Current exchange rate: {current_rate}
 
Their recent transfers:
{transfer_summary}
 
Their investments:
{investment_summary}
 
Be concise and friendly. Only answer questions related to their account, transfers, investments, and HawalaLink.
Never make up data — only use the information provided above."""
 
    api_key = getattr(settings, 'ANTHROPIC_API_KEY', os.environ.get('ANTHROPIC_API_KEY', ''))
    if not api_key:
        return "AI service not configured. Add ANTHROPIC_API_KEY to your .env file."
 
    messages = []
    if conversation_history:
        for msg in conversation_history[-6:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": question})
 
    headers = {
        "x-api-key":         api_key,
        "anthropic-version": "2023-06-01",
        "content-type":      "application/json",
    }
    payload = {
        "model":      CLAUDE_MODEL,
        "max_tokens": 512,
        "system":     system_prompt,
        "messages":   messages,
    }
    try:
        res = requests.post(CLAUDE_API_URL, headers=headers, json=payload, timeout=30)
        res.raise_for_status()
        return res.json()["content"][0]["text"]
    except Exception:
        return "Sorry, I couldn't process that. Please try again."
 
 
# ── Agent 2: Rate Analyst ─────────────────────────────────────────
 
def rate_analyst():
    from apps.transfers.models import ExchangeRate
 
    rates = ExchangeRate.objects.order_by('-updated_at')[:20]
    if not rates:
        return {"advice": "No rate history available yet.", "trend": "unknown", "change_pct": 0, "latest_rate": None}
 
    rate_history = "\n".join([
        f"- {r.updated_at.strftime('%d %b %Y %H:%M')}: 1 GBP = {r.gbp_to_sdg} SDG"
        for r in rates
    ])
 
    latest  = float(rates[0].gbp_to_sdg)
    oldest  = float(rates[len(rates)-1].gbp_to_sdg)
    change  = latest - oldest
    pct     = (change / oldest * 100) if oldest else 0
 
    system_prompt = """You are a currency analyst for HawalaLink.
Analyse GBP/SDG rate history and give concise advice to Sudan investors.
For Sudan users: if rate RISES (SDG weakens vs GBP) they GAIN GBP value. If rate DROPS they LOSE.
Be direct. Give a clear recommendation in 2-3 sentences. End with confidence: Low/Medium/High."""
 
    user_message = f"""Recent GBP/SDG rate history (most recent first):
{rate_history}
 
Overall change: {change:+.4f} SDG ({pct:+.2f}%) over {rates.count()} updates.
 
Should Sudan investors cash out now or wait?"""
 
    advice = _call_claude(system_prompt, user_message, max_tokens=300)
    trend  = "rising" if change > 0 else "falling" if change < 0 else "stable"
 
    return {
        "advice":      advice,
        "trend":       trend,
        "change_pct":  round(pct, 2),
        "latest_rate": str(rates[0].gbp_to_sdg),
        "rate_count":  rates.count(),
    }
 
 
# ── Agent 3: Maturity Advisor ─────────────────────────────────────
 
def maturity_advisor(investment):
    from apps.transfers.models import ExchangeRate
 
    rate_obj     = ExchangeRate.objects.order_by('-updated_at').first()
    current_rate = float(rate_obj.gbp_to_sdg) if rate_obj else None
 
    if not current_rate:
        return "Cannot provide advice — no current exchange rate is set."
 
    current_gbp    = float(investment.invested_sdg) / current_rate
    submission_gbp = float(investment.gbp_at_submission)
    gain_loss      = current_gbp - submission_gbp
    gain_pct       = (gain_loss / submission_gbp * 100) if submission_gbp else 0
 
    system_prompt = """You are a financial advisor for HawalaLink.
Give a concise personalised recommendation: cash out or reinvest.
Start with either 'Recommend: Cash Out' or 'Recommend: Reinvest'.
Give 2-3 sentences of reasoning. Be honest about risks."""
 
    user_message = f"""Investment summary:
- Invested: {investment.invested_sdg} SDG
- GBP at submission: £{submission_gbp:.2f} (rate: 1 GBP = {investment.rate_at_submission} SDG)
- Current GBP value: £{current_gbp:.2f} (rate: 1 GBP = {current_rate} SDG)
- Gain/Loss: £{gain_loss:+.2f} ({gain_pct:+.1f}%)
- Period: {investment.period_months} months, Due: {investment.due_date}, Status: {investment.status}
 
Cash out or reinvest?"""
 
    return _call_claude(system_prompt, user_message, max_tokens=200)
 
 
# ── Agent 4: Fraud Detector ───────────────────────────────────────
 
def fraud_detector(transfer):
    from apps.transfers.models import Transfer
 
    history    = Transfer.objects.filter(user=transfer.user).exclude(pk=transfer.pk).order_by('-created_at')[:10]
    avg_amount = sum(float(t.amount_sdg) for t in history) / len(history) if history else 0
 
    history_summary = "\n".join([
        f"- #{t.id}: {t.amount_sdg} SDG to '{t.recipient}', status={t.status}, date={t.created_at.date()}"
        for t in history
    ]) or "No previous transfers."
 
    system_prompt = """You are a fraud detection agent for HawalaLink.
Analyse transfers for suspicious patterns: unusually large amounts, new recipients with large amounts,
multiple transfers in short time, round number structuring, unusual timing.
Respond ONLY with valid JSON in this exact format:
{"risk_level": "low|medium|high", "risk_score": 0-100, "flags": ["flag1"], "explanation": "brief explanation", "recommendation": "approve|review|reject"}"""
 
    user_message = f"""Analyse this transfer:
- User: {transfer.user.name} ({transfer.user.email}), country={transfer.user.country}
- Amount: {transfer.amount_sdg} SDG
- Recipient: {transfer.recipient}
- Date: {transfer.created_at}
- Note: {transfer.note or 'none'}
- User average transfer: {avg_amount:.0f} SDG
 
Transfer history:
{history_summary}"""
 
    response = _call_claude(system_prompt, user_message, max_tokens=300)
 
    try:
        start = response.find('{')
        end   = response.rfind('}') + 1
        if start >= 0 and end > start:
            return json.loads(response[start:end])
    except Exception:
        pass
 
    return {
        "risk_level":     "unknown",
        "risk_score":     0,
        "flags":          [],
        "explanation":    response,
        "recommendation": "review",
    }
 
 
# ── Agent 5: Liquidity Monitor ────────────────────────────────────
 
def liquidity_monitor():
    from apps.transfers.models import Investment, Transfer
    from django.utils import timezone
    from datetime import timedelta
 
    today     = timezone.now().date()
    in_30days = today + timedelta(days=30)
 
    active_investments = Investment.objects.filter(status__in=['active', 'matured'])
    total_invested_sdg = sum(float(i.invested_sdg) for i in active_investments)
 
    maturing_soon = Investment.objects.filter(
        status__in=['active', 'matured'],
        due_date__lte=in_30days,
        due_date__gte=today,
    )
    maturing_sdg = sum(float(i.invested_sdg) for i in maturing_soon)
 
    pending_transfers = Transfer.objects.filter(status='pending')
    pending_sdg       = sum(float(t.amount_sdg) for t in pending_transfers)
 
    total_fees = sum(float(i.service_charge) for i in Investment.objects.all()) + \
                 sum(float(t.fee or 0) for t in Transfer.objects.filter(status='approved'))
 
    system_prompt = """You are a liquidity risk analyst for HawalaLink.
Analyse the platform's SDG liquidity and warn about risks.
Be concise — 3-4 sentences. Flag urgent concerns clearly.
End with exactly one of: STATUS: HEALTHY / STATUS: WARNING / STATUS: CRITICAL"""
 
    user_message = f"""Liquidity snapshot:
- Total SDG in active investments: {total_invested_sdg:,.0f} SDG
- SDG maturing in next 30 days: {maturing_sdg:,.0f} SDG
- SDG in pending transfers: {pending_sdg:,.0f} SDG
- Total fees collected: {total_fees:,.0f} SDG
- Active investments: {active_investments.count()}
- Maturing soon: {maturing_soon.count()}
- Pending transfers: {pending_transfers.count()}
 
Is liquidity healthy? Any risks in the next 30 days?"""
 
    advice = _call_claude(system_prompt, user_message, max_tokens=300)
 
    status = "HEALTHY"
    if "STATUS: CRITICAL" in advice.upper():
        status = "CRITICAL"
    elif "STATUS: WARNING" in advice.upper():
        status = "WARNING"
 
    return {
        "status":          status,
        "advice":          advice,
        "total_invested":  round(total_invested_sdg, 2),
        "maturing_30days": round(maturing_sdg, 2),
        "pending_sdg":     round(pending_sdg, 2),
        "total_fees":      round(total_fees, 2),
        "active_count":    active_investments.count(),
        "maturing_count":  maturing_soon.count(),
    }
# ── Agent 6: AI Accountant ────────────────────────────────────────
# Add this function to the bottom of services/agents.py

def ai_accountant(question: str = None, report_type: str = 'summary') -> dict:
    """
    AI Accountant — tracks income, generates reports, answers finance questions.
    report_type: 'summary' | 'weekly' | 'monthly'
    question: optional free-text finance question
    """
    from apps.transfers.models import Transfer, Investment
    from django.utils import timezone
    from datetime import timedelta

    today     = timezone.now().date()
    week_ago  = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # ── Income from transfer fees (UK users)
    all_transfers      = Transfer.objects.filter(status='approved')
    transfer_fees_total = sum(float(t.fee or 0) for t in all_transfers)
    transfer_fees_week  = sum(float(t.fee or 0) for t in all_transfers if t.created_at.date() >= week_ago)
    transfer_fees_month = sum(float(t.fee or 0) for t in all_transfers if t.created_at.date() >= month_ago)

    # ── Income from investment service charges (Sudan users)
    all_investments      = Investment.objects.all()
    invest_fees_total    = sum(float(i.service_charge or 0) for i in all_investments)
    invest_fees_week     = sum(float(i.service_charge or 0) for i in all_investments if i.created_at.date() >= week_ago)
    invest_fees_month    = sum(float(i.service_charge or 0) for i in all_investments if i.created_at.date() >= month_ago)

    # ── Totals
    total_revenue       = transfer_fees_total + invest_fees_total
    weekly_revenue      = transfer_fees_week + invest_fees_week
    monthly_revenue     = transfer_fees_month + invest_fees_month

    # ── Transfer volume
    total_volume_sdg    = sum(float(t.amount_sdg) for t in all_transfers)
    total_volume_gbp    = sum(float(t.amount_gbp or 0) for t in all_transfers)

    # ── Investment stats
    active_investments  = Investment.objects.filter(status='active').count()
    matured_investments = Investment.objects.filter(status='matured').count()
    cashed_out          = Investment.objects.filter(status='cashed_out').count()
    total_invested_sdg  = sum(float(i.invested_sdg) for i in Investment.objects.filter(status__in=['active','matured']))

    financial_summary = f"""
HawalaLink Financial Summary:

REVENUE:
- Total revenue: £{total_revenue:,.2f} GBP
- Last 7 days: £{weekly_revenue:,.2f} GBP
- Last 30 days: £{monthly_revenue:,.2f} GBP

INCOME BREAKDOWN:
- Transfer fees (UK users): £{transfer_fees_total:,.2f} total | £{transfer_fees_week:,.2f} this week | £{transfer_fees_month:,.2f} this month
- Investment service charges (Sudan users): {invest_fees_total:,.0f} SDG total | {invest_fees_week:,.0f} SDG this week | {invest_fees_month:,.0f} SDG this month

TRANSFER VOLUME:
- Total approved transfers: {all_transfers.count()}
- Total volume: {total_volume_sdg:,.0f} SDG | £{total_volume_gbp:,.2f} GBP

INVESTMENTS:
- Active: {active_investments}
- Matured (awaiting action): {matured_investments}
- Cashed out: {cashed_out}
- Total SDG under management: {total_invested_sdg:,.0f} SDG
"""

    if question:
        system_prompt = """You are an AI accountant for HawalaLink, a UK-Sudan hawala transfer and investment platform.
Answer finance questions concisely based on the financial data provided.
Be specific with numbers. If asked for advice, give actionable recommendations.
Format currency as £ for GBP and SDG for Sudanese pounds."""

        user_message = f"""Financial data:
{financial_summary}

Question: {question}"""
        answer = _call_claude(system_prompt, user_message, max_tokens=400)
    else:
        report_label = {'weekly': 'Weekly', 'monthly': 'Monthly', 'summary': 'Summary'}[report_type]
        system_prompt = f"""You are an AI accountant for HawalaLink.
Generate a concise {report_label} financial report based on the data.
Use bullet points. Be specific. Flag anything that needs admin attention.
End with 1-2 actionable recommendations."""

        answer = _call_claude(system_prompt, f"Generate a {report_label} report:\n{financial_summary}", max_tokens=500)

    return {
        'total_revenue':      round(total_revenue, 2),
        'weekly_revenue':     round(weekly_revenue, 2),
        'monthly_revenue':    round(monthly_revenue, 2),
        'transfer_fees':      round(transfer_fees_total, 2),
        'invest_fees_sdg':    round(invest_fees_total, 2),
        'total_transfers':    all_transfers.count(),
        'total_volume_sdg':   round(total_volume_sdg, 2),
        'active_investments': active_investments,
        'report':             answer,
    }
    