from django.db import models
from django.conf import settings
from django.utils import timezone
from dateutil.relativedelta import relativedelta
from decimal import Decimal


class ExchangeRate(models.Model):
    gbp_to_sdg = models.DecimalField(max_digits=12, decimal_places=4)
    set_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='rates_set'
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f'1 GBP = {self.gbp_to_sdg} SDG'


class BankAccount(models.Model):
    account_number = models.CharField(max_length=7)
    account_holder = models.CharField(max_length=150)
    updated_by     = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='bank_accounts_set'
    )
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Bankak: {self.account_number} — {self.account_holder}"


class Transfer(models.Model):
    STATUS = [
        ('pending',  'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    user           = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transfers')
    recipient      = models.CharField(max_length=200)
    amount_sdg     = models.DecimalField(max_digits=12, decimal_places=2)
    amount_gbp     = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    receipt        = models.FileField(upload_to='receipts/')
    ocr_amount     = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    ocr_match      = models.BooleanField(null=True, blank=True)
    status         = models.CharField(max_length=20, choices=STATUS, default='pending')
    note           = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    approved_at    = models.DateTimeField(null=True, blank=True)

    # FX / fee fields
    fee            = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_charged  = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rate_used      = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    recipient_gets = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    def __str__(self):
        return f"{self.user.email} → {self.recipient} | {self.amount_sdg} SDG"


class Investment(models.Model):
    PERIOD_CHOICES = [
        (6,  '6 Months'),
        (9,  '9 Months'),
        (12, '1 Year'),
    ]
    STATUS_CHOICES = [
        ('active',     'Active'),
        ('matured',    'Matured'),
        ('cashed_out', 'Cashed Out'),
        ('reinvested', 'Reinvested'),
    ]

    SERVICE_CHARGE = Decimal('5000.00')

    user                = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='investments')
    amount_sdg          = models.DecimalField(max_digits=12, decimal_places=2)
    service_charge      = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('5000.00'))
    invested_sdg        = models.DecimalField(max_digits=12, decimal_places=2)
    rate_at_submission  = models.DecimalField(max_digits=12, decimal_places=4)
    gbp_at_submission   = models.DecimalField(max_digits=10, decimal_places=4)
    period_months       = models.IntegerField(choices=PERIOD_CHOICES)
    start_date          = models.DateField(auto_now_add=True)
    due_date            = models.DateField()
    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')

    rate_at_maturity    = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)
    gbp_at_maturity     = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    gain_loss_gbp       = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    actioned_at         = models.DateTimeField(null=True, blank=True)

    reinvested_to       = models.OneToOneField(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reinvested_from'
    )

    created_at          = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.due_date and self.period_months:
            base = self.start_date if self.start_date else timezone.now().date()
            self.due_date = base + relativedelta(months=self.period_months)
        super().save(*args, **kwargs)

    def current_gbp_value(self, current_rate):
        if current_rate and current_rate > 0:
            return round(self.invested_sdg / current_rate, 4)
        return None

    def __str__(self):
        return f"{self.user.email} | {self.invested_sdg} SDG | {self.period_months}mo | {self.status}"


class Notification(models.Model):
    TYPE_CHOICES = [
        ('due_soon', 'Payment Due Soon'),
        ('matured',  'Investment Matured'),
    ]
    investment = models.ForeignKey(Investment, on_delete=models.CASCADE, related_name='notifications')
    type       = models.CharField(max_length=20, choices=TYPE_CHOICES, default='due_soon')
    message    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.investment} — {self.created_at:%Y-%m-%d}"
