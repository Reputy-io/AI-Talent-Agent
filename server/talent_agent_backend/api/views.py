from django.shortcuts import render
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User, QuestionnaireResponse, AIAnalysis
from .serializers import (
    UserSerializer, 
    QuestionnaireResponseSerializer, 
    AIAnalysisSerializer,
    QuestionnaireWithAnalysisSerializer
)
from .ai_utils import get_ai_instance

# Create your views here.

class UserViewSet(viewsets.ModelViewSet):
    """API endpoint for users"""
    queryset = User.objects.all()
    serializer_class = UserSerializer


class QuestionnaireViewSet(viewsets.ModelViewSet):
    """API endpoint for questionnaire responses"""
    queryset = QuestionnaireResponse.objects.all()
    serializer_class = QuestionnaireResponseSerializer
    
    def get_serializer_class(self):
        """Return different serializers based on action"""
        if self.action == 'retrieve' or self.action == 'list':
            return QuestionnaireWithAnalysisSerializer
        return QuestionnaireResponseSerializer
    
    @action(detail=True, methods=['post'])
    def generate_analysis(self, request, pk=None):
        """Generate AI analysis for a questionnaire"""
        questionnaire = self.get_object()
        
        # Get AI instance
        ai = get_ai_instance()
        
        # Extract questionnaire data
        questionnaire_data = QuestionnaireResponseSerializer(questionnaire).data
        
        # Generate analysis
        analysis_data = ai.generate_career_analysis(questionnaire_data)
        
        # Create or update AI analysis
        analysis, created = AIAnalysis.objects.update_or_create(
            questionnaire=questionnaire,
            defaults={
                'career_profile_summary': analysis_data.get('career_profile_summary', ''),
                'cv_recommendations': analysis_data.get('cv_recommendations', ''),
                'interview_tips': analysis_data.get('interview_tips', ''),
                'skill_development_plan': analysis_data.get('skill_development_plan', ''),
                'raw_ai_response': analysis_data.get('raw_response', {})
            }
        )
        
        # Return the updated questionnaire with analysis
        serializer = QuestionnaireWithAnalysisSerializer(questionnaire)
        return Response(serializer.data)


class AIAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for AI analysis (read-only)"""
    queryset = AIAnalysis.objects.all()
    serializer_class = AIAnalysisSerializer


@api_view(['POST'])
def submit_questionnaire(request):
    """
    Submit a complete questionnaire and generate AI analysis in one step
    """
    # Extract user data and create/get user
    email = request.data.get('email')
    user_data = {'email': email} if email else {}
    
    if email:
        user, created = User.objects.get_or_create(email=email, defaults=user_data)
    else:
        user = User.objects.create()
    
    # Create questionnaire response
    questionnaire_data = {
        'user': user.id,
        'current_role': request.data.get('current_role'),
        'years_experience': request.data.get('years_experience'),
        'key_skills': request.data.get('key_skills'),
        'education': request.data.get('education'),
        'career_achievements': request.data.get('career_achievements'),
        'job_seeking': request.data.get('job_seeking'),
        'cv_challenges': request.data.get('cv_challenges'),
        'interview_challenges': request.data.get('interview_challenges'),
        'soft_skills': request.data.get('soft_skills'),
        'career_goals': request.data.get('career_goals'),
    }
    
    questionnaire_serializer = QuestionnaireResponseSerializer(data=questionnaire_data)
    
    if questionnaire_serializer.is_valid():
        questionnaire = questionnaire_serializer.save()
        
        # Generate AI analysis
        ai = get_ai_instance()
        analysis_data = ai.generate_career_analysis(questionnaire_data)
        
        # Create AI analysis
        analysis = AIAnalysis.objects.create(
            questionnaire=questionnaire,
            career_profile_summary=analysis_data.get('career_profile_summary', ''),
            cv_recommendations=analysis_data.get('cv_recommendations', ''),
            interview_tips=analysis_data.get('interview_tips', ''),
            skill_development_plan=analysis_data.get('skill_development_plan', ''),
            raw_ai_response=analysis_data.get('raw_response', {})
        )
        
        # Return the questionnaire with analysis
        result_serializer = QuestionnaireWithAnalysisSerializer(questionnaire)
        return Response(result_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(questionnaire_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
