from django.contrib import admin
from .models import User, QuestionnaireResponse, AIAnalysis

# Register your models here.
@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'email', 'created_at')
    search_fields = ('email',)
    ordering = ('-created_at',)

@admin.register(QuestionnaireResponse)
class QuestionnaireResponseAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'current_role', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'current_role', 'key_skills')
    ordering = ('-created_at',)

@admin.register(AIAnalysis)
class AIAnalysisAdmin(admin.ModelAdmin):
    list_display = ('id', 'questionnaire', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('questionnaire__user__email',)
    ordering = ('-created_at',)
