"""
Management command: check_due_investments
 
Run daily via cron or Windows Task Scheduler:
    python manage.py check_due_investments
 
- Creates Notification records 10 days before due_date
- Marks investments as 'matured' on/after due_date
- Sends email to admin if ADMIN_NOTIFICATION_EMAIL is set in settings
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from datetime import timedelta
 
from apps.transfers.models import Investment, Notification
 
 
class Command(BaseCommand):
    help = 'Check investments due within 10 days and notify admin'
 
    def handle(self, *args, **kwargs):
        today     = timezone.now().date()
        threshold = today + timedelta(days=10)
 
        # ── Mark matured ──────────────────────────────────────────
        matured = Investment.objects.filter(
            status='active',
            due_date__lte=today,
        )
        matured_count = matured.count()
        matured.update(status='matured')
 
        # ── Notify admin of upcoming due dates ────────────────────
        due_soon = Investment.objects.filter(
            due_date__gt=today,
            due_date__lte=threshold,
            status__in=['active', 'matured'],
        )
 
        created_count = 0
        for inv in due_soon:
            days_left = (inv.due_date - today).days
 
            # One notification per investment per day max
            already_exists = Notification.objects.filter(
                investment=inv,
                created_at__date=today,
            ).exists()
 
            if not already_exists:
                message = (
                    f"{inv.user.name} ({inv.user.email}) has an investment of "
                    f"{inv.invested_sdg:,.2f} SDG (≈ £{inv.gbp_at_submission:.2f} GBP at submission) "
                    f"maturing on {inv.due_date.strftime('%d %b %Y')} "
                    f"— {days_left} day{'s' if days_left != 1 else ''} remaining."
                )
                Notification.objects.create(
                    investment=inv,
                    type='due_soon',
                    message=message,
                )
                created_count += 1
 
                # Email admin
                admin_email = getattr(settings, 'ADMIN_NOTIFICATION_EMAIL', None)
                if admin_email:
                    try:
                        send_mail(
                            subject=f'[HawalaLink] Investment due in {days_left} day{"s" if days_left != 1 else ""}',
                            message=message,
                            from_email=settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[admin_email],
                            fail_silently=True,
                        )
                    except Exception:
                        pass
 
        self.stdout.write(self.style.SUCCESS(
            f'Done — {matured_count} investment(s) marked matured, '
            f'{created_count} notification(s) created.'
        ))