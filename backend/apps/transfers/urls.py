from django.urls import path
from . import views
 
urlpatterns = [
    # Transfers
    path('',                              views.TransferListView.as_view(),  name='transfer-list'),
    path('send/',                         views.CreateTransferView.as_view(), name='transfer-create'),
    path('<int:pk>/decision/',            views.transfer_decision,            name='transfer-decision'),
 
    # FX Rate
    path('rate/',                         views.get_rate,                     name='rate-get'),
    path('rate/set/',                     views.set_rate,                     name='rate-set'),
    path('rate/preview/',                 views.preview_transfer,             name='rate-preview'),
 
    # Investments
    path('investments/',                  views.list_investments,             name='investment-list'),
    path('investments/create/',           views.create_investment,            name='investment-create'),
    path('investments/<int:pk>/cashout/', views.cashout_investment,           name='investment-cashout'),
    path('investments/<int:pk>/reinvest/',views.reinvest_investment,          name='investment-reinvest'),
    path('bank-account/',     views.get_bank_account, name='bank-account-get'),
    path('bank-account/set/', views.set_bank_account, name='bank-account-set'),
    # Notifications
    path('notifications/',                views.get_notifications,            name='notifications'),
    path('notifications/read-all/',       views.mark_all_read,                name='notifications-read-all'),
    path('notifications/<int:pk>/read/',  views.mark_notification_read,       name='notification-read'),
    path('analytics/', views.analytics, name='analytics'),
]