from rest_framework import serializers
from .models import User, QuestionnaireResponse, AIAnalysis

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'created_at', 'updated_at']


class QuestionnaireResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuestionnaireResponse
        fields = [
            'id', 'user', 'current_role', 'years_experience', 'key_skills',
            'education', 'career_achievements', 'job_seeking', 'cv_challenges',
            'interview_challenges', 'soft_skills', 'career_goals',
            'created_at', 'updated_at'
        ]


class AIAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAnalysis
        fields = [
            'id', 'questionnaire', 'career_profile_summary', 'cv_recommendations',
            'interview_tips', 'skill_development_plan', 'created_at', 'updated_at'
        ]
        read_only_fields = ['raw_ai_response']


class QuestionnaireWithAnalysisSerializer(serializers.ModelSerializer):
    ai_analysis = AIAnalysisSerializer(read_only=True)
    
    class Meta:
        model = QuestionnaireResponse
        fields = [
            'id', 'user', 'current_role', 'years_experience', 'key_skills',
            'education', 'career_achievements', 'job_seeking', 'cv_challenges',
            'interview_challenges', 'soft_skills', 'career_goals',
            'created_at', 'updated_at', 'ai_analysis'
        ]
