from django.db import models

# Create your models here.

class User(models.Model):
    """Model to store basic user information"""
    email = models.EmailField(unique=True, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"User {self.id}: {self.email or 'Anonymous'}"


class QuestionnaireResponse(models.Model):
    """Model to store user's questionnaire responses"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='questionnaire_responses')
    
    # Career information fields based on the questionnaire
    current_role = models.CharField(max_length=255, blank=True, null=True)
    years_experience = models.CharField(max_length=100, blank=True, null=True)
    key_skills = models.TextField(blank=True, null=True)
    education = models.TextField(blank=True, null=True)
    career_achievements = models.TextField(blank=True, null=True)
    job_seeking = models.TextField(blank=True, null=True)
    cv_challenges = models.TextField(blank=True, null=True)
    interview_challenges = models.TextField(blank=True, null=True)
    soft_skills = models.TextField(blank=True, null=True)
    career_goals = models.TextField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Questionnaire for {self.user}"


class AIAnalysis(models.Model):
    """Model to store AI analysis and recommendations based on user responses"""
    questionnaire = models.OneToOneField(QuestionnaireResponse, on_delete=models.CASCADE, related_name='ai_analysis')
    
    # AI-generated content
    career_profile_summary = models.TextField(blank=True, null=True)
    cv_recommendations = models.TextField(blank=True, null=True)
    interview_tips = models.TextField(blank=True, null=True)
    skill_development_plan = models.TextField(blank=True, null=True)
    
    # Raw AI response data
    raw_ai_response = models.JSONField(blank=True, null=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"AI Analysis for {self.questionnaire.user}"
