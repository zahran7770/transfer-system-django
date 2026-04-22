from rest_framework import serializers
from .models import Transfer

class TransferSerializer(serializers.ModelSerializer):
    # Using 'username' as 'name' usually doesn't exist on the default user model
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name  = serializers.CharField(source='user.username', read_only=True) 

    class Meta:
        model  = Transfer
        fields = [
            'id', 'user_email', 'user_name', 'recipient',
            'amount_sdg', 'amount_gbp', 'receipt',
            'ocr_amount', 'ocr_match', 'status',
            'note', 'created_at', 'approved_at'
        ]
        read_only_fields = [
            'amount_gbp', 'ocr_amount', 'ocr_match',
            'status', 'approved_at'
        ]
        extra_kwargs = {
         