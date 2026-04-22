from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.utils import timezone
from decimal import Decimal
 
from .models import Transfer, ExchangeRate, Investment, Notification
from .serializers import (
    TransferSerializer, ExchangeRateSerializer,
    InvestmentSerializer, NotificationSerializer,
)
from services.fx_rates import calculate_transfer
 
 
# ── Helpers ──────────────────────────────────────────────────────
 
def get_latest_rate():
    rate = ExchangeRate.objects.order_by('-updated_at').first()
    if not rate:
        raise ValueError('No exchange rate set. Admin must configure it first.')
    return rate
 
 
# ── FX Rate endpoints ─────────────────────────────────────────────
 
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_rate(request):
    rate = ExchangeRate.objects.order_by('-updated_at').first()
    if not rate:
        return Response({'error': 'No rate set yet'}, status=404)
    return Response(ExchangeRateSerializer(rate).data)
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def set_rate(request):
    serializer = ExchangeRateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(set_by=request.user)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def preview_transfer(request):
    try:
        amount  = Decimal(str(request.data['amount']))
        country = request.data['sender_country']
        result  = calculate_transfer(amount, country)
        return Response({
            'send_amount':    str(result['send_amount']),
            'fee':            str(result['fee']),
            'total_charged':  str(result['total_charged']),
            'rate':           str(result['rate']),
            'recipient_gets': str(result['recipient_gets']),
        })
    except (KeyError, ValueError) as e:
        return Response({'error': str(e)}, status=400)
 
 
# ── Transfer endpoints ────────────────────────────────────────────
 
class TransferListView(generics.ListAPIView):
    serializer_class   = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]
 
    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Transfer.objects.all().order_by('-created_at')
        return Transfer.objects.filter(user=user).order_by('-created_at')
 
 
class CreateTransferView(generics.CreateAPIView):
    serializer_class   = TransferSerializer
    permission_classes = [permissions.IsAuthenticated]
 
    def perform_create(self, serializer):
        user   = self.request.user
        amount = serializer.validated_data['amount_sdg']
        calc   = calculate_transfer(amount, user.country)
        rate_obj = ExchangeRate.objects.order_by('-updated_at').first()
        serializer.save(
            user               = user,
            fee                = calc['fee'],
            total_charged      = calc['total_charged'],
            rate_used          = calc['rate'],
            recipient_gets     = calc['recipient_gets'],
        )
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def transfer_decision(request, pk):
    try:
        transfer = Transfer.objects.get(pk=pk)
    except Transfer.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
    new_status = request.data.get('status')
    if new_status not in ['approved', 'rejected']:
        return Response({'error': 'Invalid status'}, status=400)
    transfer.status = new_status
    if new_status == 'approved':
        transfer.approved_at = timezone.now()
    transfer.save()
    return Response(TransferSerializer(transfer).data)
 
 
# ── Investment endpoints ──────────────────────────────────────────
 
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def list_investments(request):
    """List investments for the current user (or all for admin)."""
    if request.user.is_staff:
        investments = Investment.objects.all()
    else:
        investments = Investment.objects.filter(user=request.user)
 
    # Attach current GBP value to each
    try:
        rate = get_latest_rate()
        current_rate = rate.gbp_to_sdg
    except ValueError:
        current_rate = None
 
    data = InvestmentSerializer(investments, many=True).data
    for i, inv in enumerate(investments):
        current_gbp = inv.current_gbp_value(current_rate)
        data[i]['current_gbp_value'] = str(current_gbp) if current_gbp else None
        data[i]['current_rate']      = str(current_rate) if current_rate else None
 
    return Response(data)
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_investment(request):
    """
    Sudan user creates a new investment.
    POST { amount_sdg, period_months }
    Service charge (5000 SDG) deducted upfront.
    """
    try:
        amount_sdg    = Decimal(str(request.data['amount_sdg']))
        period_months = int(request.data['period_months'])
    except (KeyError, ValueError):
        return Response({'error': 'amount_sdg and period_months are required.'}, status=400)
 
    if period_months not in [6, 9, 12]:
        return Response({'error': 'period_months must be 6, 9, or 12.'}, status=400)
 
    service_charge = Investment.SERVICE_CHARGE
    if amount_sdg <= service_charge:
        return Response(
            {'error': f'Amount must be greater than the service charge of {service_charge} SDG.'},
            status=400
        )
 
    try:
        rate_obj = get_latest_rate()
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
 
    invested_sdg       = amount_sdg - service_charge
    rate_at_submission = rate_obj.gbp_to_sdg
    gbp_at_submission  = round(invested_sdg / rate_at_submission, 4)
 
    investment = Investment.objects.create(
        user               = request.user,
        amount_sdg         = amount_sdg,
        service_charge     = service_charge,
        invested_sdg       = invested_sdg,
        rate_at_submission = rate_at_submission,
        gbp_at_submission  = gbp_at_submission,
        period_months      = period_months,
    )
 
    return Response(InvestmentSerializer(investment).data, status=201)
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def cashout_investment(request, pk):
    """
    User cashes out a matured investment.
    Locks in the current rate as rate_at_maturity.
    """
    try:
        investment = Investment.objects.get(pk=pk, user=request.user)
    except Investment.DoesNotExist:
        return Response({'error': 'Investment not found.'}, status=404)
 
    if investment.status not in ['active', 'matured']:
        return Response({'error': 'This investment has already been actioned.'}, status=400)
 
    try:
        rate_obj = get_latest_rate()
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
 
    current_rate       = rate_obj.gbp_to_sdg
    gbp_at_maturity    = round(investment.invested_sdg / current_rate, 4)
    gain_loss_gbp      = round(gbp_at_maturity - investment.gbp_at_submission, 4)
 
    investment.status           = 'cashed_out'
    investment.rate_at_maturity = current_rate
    investment.gbp_at_maturity  = gbp_at_maturity
    investment.gain_loss_gbp    = gain_loss_gbp
    investment.actioned_at      = timezone.now()
    investment.save()
 
    return Response({
        'status':           'cashed_out',
        'invested_sdg':     str(investment.invested_sdg),
        'gbp_at_submission':str(investment.gbp_at_submission),
        'gbp_at_maturity':  str(gbp_at_maturity),
        'gain_loss_gbp':    str(gain_loss_gbp),
        'rate_at_maturity': str(current_rate),
    })
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def reinvest_investment(request, pk):
    """
    User reinvests a matured investment into a new period.
    POST { period_months }
    No new service charge — the full invested_sdg rolls over.
    """
    try:
        investment = Investment.objects.get(pk=pk, user=request.user)
    except Investment.DoesNotExist:
        return Response({'error': 'Investment not found.'}, status=404)
 
    if investment.status not in ['active', 'matured']:
        return Response({'error': 'This investment has already been actioned.'}, status=400)
 
    try:
        new_period = int(request.data['period_months'])
    except (KeyError, ValueError):
        return Response({'error': 'period_months is required.'}, status=400)
 
    if new_period not in [6, 9, 12]:
        return Response({'error': 'period_months must be 6, 9, or 12.'}, status=400)
 
    try:
        rate_obj = get_latest_rate()
    except ValueError as e:
        return Response({'error': str(e)}, status=400)
 
    current_rate    = rate_obj.gbp_to_sdg
    gbp_at_maturity = round(investment.invested_sdg / current_rate, 4)
    gain_loss_gbp   = round(gbp_at_maturity - investment.gbp_at_submission, 4)
 
    # Close old investment
    investment.status           = 'reinvested'
    investment.rate_at_maturity = current_rate
    investment.gbp_at_maturity  = gbp_at_maturity
    investment.gain_loss_gbp    = gain_loss_gbp
    investment.actioned_at      = timezone.now()
 
    # Create new investment — no service charge, full invested_sdg rolls over
    new_investment = Investment.objects.create(
        user               = request.user,
        amount_sdg         = investment.invested_sdg,
        service_charge     = Decimal('0.00'),
        invested_sdg       = investment.invested_sdg,
        rate_at_submission = current_rate,
        gbp_at_submission  = gbp_at_maturity,
        period_months      = new_period,
    )
 
    investment.reinvested_to = new_investment
    investment.save()
 
    return Response({
        'status':        'reinvested',
        'new_investment': InvestmentSerializer(new_investment).data,
    }, status=201)
 
 
# ── Notification endpoints ────────────────────────────────────────
 
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def get_notifications(request):
    notifications = Notification.objects.filter(is_read=False)
    return Response({
        'count':         notifications.count(),
        'notifications': NotificationSerializer(notifications, many=True).data,
    })
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def mark_notification_read(request, pk):
    try:
        n = Notification.objects.get(pk=pk)
        n.is_read = True
        n.save()
        return Response({'status': 'ok'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found'}, status=404)
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def mark_all_read(request):
    Notification.objects.filter(is_read=False).update(is_read=True)
    return Response({'status': 'ok'})
# ── Add these two views to your existing transfers/views.py ──────
 
@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def get_bank_account(request):
    """Sudan users fetch the Bankak account to send money to."""
    from .models import BankAccount
    account = BankAccount.objects.order_by('-updated_at').first()
    if not account:
        return Response({'error': 'No bank account set yet. Contact admin.'}, status=404)
    return Response({
        'account_number': account.account_number,
        'account_holder': account.account_holder,
        'updated_at':     account.updated_at,
    })
 
 
@api_view(['POST'])
@permission_classes([permissions.IsAdminUser])
def set_bank_account(request):
    """Admin sets the Bankak account number and holder name."""
    from .models import BankAccount
    number = request.data.get('account_number', '').strip()
    holder = request.data.get('account_holder', '').strip()
 
    if not number or not holder:
        return Response({'error': 'account_number and account_holder are required.'}, status=400)
    if len(number) != 7 or not number.isdigit():
        return Response({'error': 'account_number must be exactly 7 digits.'}, status=400)
 
    account = BankAccount.objects.create(
        account_number=number,
        account_holder=holder,
        updated_by=request.user,
    )
    return Response({
        'account_number': account.account_number,
        'account_holder': account.account_holder,
        'updated_at':     account.updated_at,
    }, status=201)
    
@api_view(['GET'])
@permission_classes([permissions.IsAdminUser])
def analytics(request):
    """Returns analytics data for the admin dashboard charts."""
    from django.contrib.auth import get_user_model
    from django.utils import timezone
    from datetime import timedelta
    from .models import Investment
 
    User  = get_user_model()
    today = timezone.now().date()
 
    # ── Quick metrics ─────────────────────────────────────────────
    total_users     = User.objects.count()
    pending         = Transfer.objects.filter(status='pending').count()
    total_transfers = Transfer.objects.count()
    failed          = Transfer.objects.filter(status='rejected').count()
 
    # ── Revenue last 30 days (day by day) ─────────────────────────
    revenue_chart = []
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        fees = sum(
            float(t.fee or 0)
            for t in Transfer.objects.filter(status='approved', created_at__date=day)
        )
        invest_fees = sum(
            float(inv.service_charge or 0)
            for inv in Investment.objects.filter(created_at__date=day)
        )
        revenue_chart.append({
            'date':    day.strftime('%d %b'),
            'revenue': round(fees + invest_fees, 2),
        })
 
    # ── Investment status breakdown ───────────────────────────────
    invest_breakdown = {
        'active':     Investment.objects.filter(status='active').count(),
        'matured':    Investment.objects.filter(status='matured').count(),
        'cashed_out': Investment.objects.filter(status='cashed_out').count(),
        'reinvested': Investment.objects.filter(status='reinvested').count(),
    }
 
    # ── User growth last 30 days ──────────────────────────────────
    user_growth = []
    for i in range(29, -1, -1):
        day   = today - timedelta(days=i)
        count = User.objects.filter(created_at__date=day).count()
        user_growth.append({ 'date': day.strftime('%d %b'), 'users': count })
 
    # ── Transfer volume last 30 days ──────────────────────────────
    transfer_volume = []
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        vol = sum(
            float(t.amount_sdg)
            for t in Transfer.objects.filter(created_at__date=day)
        )
        transfer_volume.append({ 'date': day.strftime('%d %b'), 'volume': round(vol, 2) })
 
    return Response({
        'quick_metrics': {
            'total_users':     total_users,
            'pending':         pending,
            'total_transfers': total_transfers,
            'failed':          failed,
        },
        'revenue_chart':    revenue_chart,
        'invest_breakdown': invest_breakdown,
        'user_growth':      user_growth,
        'transfer_volume':  transfer_volume,
    })    