# Talent Agent Backend

This is the Django backend for the Talent Agent application. It provides API endpoints for storing user questionnaire data and generating AI-powered career analysis using Hugging Face models.

## Features

- RESTful API for user questionnaire data
- Integration with Hugging Face AI models
- Career profile analysis and recommendations
- CV improvement suggestions
- Interview preparation tips
- Skill development plans

## Setup

1. Make sure you have Python 3.8+ installed

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Set up environment variables (optional):
   ```
   export HUGGINGFACE_API_KEY=your_api_key_here
   ```

4. Apply migrations:
   ```
   python manage.py makemigrations
   python manage.py migrate
   ```

5. Create a superuser (for admin access):
   ```
   python manage.py createsuperuser
   ```

6. Run the development server:
   ```
   python manage.py runserver
   ```

## API Endpoints

- `/api/users/` - User management
- `/api/questionnaires/` - Questionnaire responses
- `/api/analyses/` - AI analyses
- `/api/submit-questionnaire/` - Submit questionnaire and generate analysis in one step

## Documentation

API documentation is available at `/docs/` when the server is running.

## Integration with Frontend

The frontend can communicate with this backend by sending POST requests to the `/api/submit-questionnaire/` endpoint with the following JSON structure:

```json
{
  "email": "user@example.com",
  "current_role": "Software Engineer",
  "years_experience": "5+ years",
  "key_skills": "Python, JavaScript, React",
  "education": "Bachelor's in Computer Science",
  "career_achievements": "Led team of 5, Increased performance by 30%",
  "job_seeking": "Senior Developer role",
  "cv_challenges": "Highlighting achievements",
  "interview_challenges": "Technical assessments",
  "soft_skills": "Leadership, communication",
  "career_goals": "Become a tech lead in the next year"
}
```

The response will include the AI-generated analysis with career profile summary, CV recommendations, interview tips, and a skill development plan.
