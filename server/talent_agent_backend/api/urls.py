from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'users', views.UserViewSet)
router.register(r'questionnaires', views.QuestionnaireViewSet)
router.register(r'analyses', views.AIAnalysisViewSet)

urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
    
    # Custom endpoints
    path('submit-questionnaire/', views.submit_questionnaire, name='submit-questionnaire'),
]
