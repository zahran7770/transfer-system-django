from decimal import Decimal
from apps.transfers.models import ExchangeRate

# Service fee constants
FEE_GBP = Decimal('1.00')   # flat £1 for UK senders

def get_current_rate():
    """Return the latest admin-set GBP→SDG rate."""
    rate = ExchangeRate.objects.order_by('-updated_at').first()
    if not rate:
        raise ValueError('No exchange rate set. Admin must configure it first.')
    return rate.gbp_to_sdg

def get_service_fee(country: str) -> Decimal:
    """
    Return service fee in the sender's currency.
    UK sender  → £1.00 GBP
    Sudan sender → equivalent of £1 in SDG
    """
    if country == 'uk':
        return FEE_GBP
    elif country == 'sudan':
        rate = get_current_rate()
        return (FEE_GBP * rate).quantize(Decimal('0.01'))
    raise ValueError(f'Unknown country: {country}')

def calculate_transfer(amount: Decimal, sender_country: str) -> dict:
    """
    Returns full breakdown:
      - send_amount   : what the user typed
      - fee           : service fee in sender currency
      - total_charged : send_amount + fee
      - rate          : GBP/SDG rate used
      - recipient_gets: converted amount (no fee deducted from this)
    """
    rate = get_current_rate()
    fee  = get_service_fee(sender_country)

    if sender_country == 'uk':
        total_charged  = amount + fee
        recipient_gets = (amount * rate).quantize(Decimal('0.01'))
    else:  # sudan
        total_charged  = amount + fee
        recipient_gets = (amount / rate).quantize(Decimal('0.01'))

    return {
        'send_amount':    amount,
        'fee':            fee,
        'total_charged':  total_charged,
        'rate':           rate,
        'recipient_gets': recipient_gets,
    }