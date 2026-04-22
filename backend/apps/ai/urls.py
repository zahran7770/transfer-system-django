from django.urls import path
from . import views

urlpatterns = [
    path('chat/',                     views.chat,            name='ai-chat'),
    path('rate-advice/',              views.rate_advice,     name='ai-rate-advice'),
    path('maturity-advice/<int:pk>/', views.maturity_advice, name='ai-maturity-advice'),
    path('fraud-check/<int:pk>/',     views.fraud_check,     name='ai-fraud-check'),
    path('accountant/', views.accountant, name='ai-accountant'),
    path('liquidity/',                views.liquidity,       name='ai-liquidity'),
]