from rest_framework import serializers
from decimal import Decimal
from .models import Transfer, ExchangeRate, Investment, Notification
 
 
class ExchangeRateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = ExchangeRate
        fields = ['id', 'gbp_to_sdg', 'updated_at']
        read_only_fields = ['updated_at']
 
 
class TransferSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name  = serializers.CharField(source='user.name',  read_only=True)
 
    class Meta:
        model  = Transfer
        fields = [
            'id', 'user_email', 'user_name', 'recipient',
            'amount_sdg', 'amount_gbp', 'receipt',
            'ocr_amount', 'ocr_match', 'status',
            'note', 'created_at', 'approved_at',
            'fee', 'total_charged', 'rate_used', 'recipient_gets',
        ]
        read_only_fields = [
            'amount_gbp', 'ocr_amount', 'ocr_match',
            'status', 'approved_at',
            'fee', 'total_charged', 'rate_used', 'recipient_gets',
        ]
        extra_kwargs = {'receipt': {'required': False}}
 
 
class InvestmentSerializer(serializers.ModelSerializer):
    user_email  = serializers.EmailField(source='user.email', read_only=True)
    user_name   = serializers.CharField(source='user.name',   read_only=True)
 
    class Meta:
        model  = Investment
        fields = [
            'id', 'user_email', 'user_name',
            'amount_sdg', 'service_charge', 'invested_sdg',
            'rate_at_submission', 'gbp_at_submission',
            'period_months', 'start_date', 'due_date', 'status',
            'rate_at_maturity', 'gbp_at_maturity', 'gain_loss_gbp',
            'actioned_at', 'created_at',
        ]
        read_only_fields = [
            'service_charge', 'invested_sdg',
            'rate_at_submission', 'gbp_at_submission',
            'start_date', 'due_date', 'status',
            'rate_at_maturity', 'gbp_at_maturity', 'gain_loss_gbp',
            'actioned_at',
        ]
 
 
class NotificationSerializer(serializers.ModelSerializer):
    user_name   = serializers.CharField(source='investment.user.name',  read_only=True)
    user_email  = serializers.EmailField(source='investment.user.email', read_only=True)
    amount_sdg  = serializers.DecimalField(source='investment.invested_sdg', max_digits=12, decimal_places=2, read_only=True)
    due_date    = serializers.DateField(source='investment.due_date', read_only=True)
    investment_id = serializers.IntegerField(source='investment.id', read_only=True)
 
    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'message', 'is_read', 'created_at',
            'investment_id', 'user_name', 'user_email', 'amount_sdg', 'due_date',
        ]
 