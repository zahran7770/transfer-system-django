from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from services.agents import (
    chat_assistant,
    rate_analyst,
    maturity_advisor,
    fraud_detector,
    liquidity_monitor,
)
 
 
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def chat(request):
    message = request.data.get('message', '').strip()
    history = request.data.get('history', [])
    if not message:
        return Response({'error': 'Message is required.'}, status=400)
    reply = chat_assistant(request.user, message, history)
    return Response({'reply': reply})
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def rate_advice(request):
    result = rate_analyst()
    return Response(result)
 
 
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def maturity_advice(request, pk):
    from apps.transfers.models import Investment
    try:
        investment = Investment.objects.get(pk=pk, user=request.user)
    except Investment.DoesNotExist:
        return Response({'error': 'Investment not found.'}, status=404)
    advice = maturity_advisor(investment)
    return Response({'advice': advice})
 
 
@api_view(['POST'])
@permission_classes([IsAdminUser])
def fraud_check(request, pk):
    from apps.transfers.models import Transfer
    try:
        transfer = Transfer.objects.get(pk=pk)
    except Transfer.DoesNotExist:
        return Response({'error': 'Transfer not found.'}, status=404)
    result = fraud_detector(transfer)
    return Response(result)
 
 
@api_view(['GET'])
@permission_classes([IsAdminUser])
def liquidity(request):
    result = liquidity_monitor()
    return Response(result)

# ── Add to apps/ai/views.py ──────────────────────────────────────

@api_view(['POST', 'GET'])
@permission_classes([IsAdminUser])
def accountant(request):
    """
    GET  → summary report
    POST { question } → answer a finance question
    POST { report_type: 'weekly'|'monthly' } → generate report
    """
    from services.agents import ai_accountant
    question    = request.data.get('question', None) if request.method == 'POST' else None
    report_type = request.data.get('report_type', 'summary') if request.method == 'POST' else 'summary'
    result = ai_accountant(question=question, report_type=report_type)
    return Response(result)