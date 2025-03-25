import os
import json
import requests
from transformers import pipeline
from django.conf import settings

class HuggingFaceAI:
    """Utility class for interacting with Hugging Face models"""
    
    def __init__(self, model_name=None, api_key=None):
        """
        Initialize the HuggingFace AI utility
        
        Args:
            model_name (str): The name of the Hugging Face model to use
            api_key (str): Hugging Face API key (if using API instead of local models)
        """
        self.api_key = api_key or os.environ.get('HUGGINGFACE_API_KEY')
        self.model_name = model_name or "gpt2"  # Default model
        self.api_url = f"https://api-inference.huggingface.co/models/{self.model_name}"
        
    def generate_career_analysis(self, questionnaire_data):
        """
        Generate career analysis based on questionnaire data
        
        Args:
            questionnaire_data (dict): User's questionnaire responses
            
        Returns:
            dict: AI-generated analysis and recommendations
        """
        # Format the questionnaire data into a prompt
        prompt = self._format_prompt(questionnaire_data)
        
        try:
            # If API key is provided, use the Hugging Face API
            if self.api_key:
                return self._generate_via_api(prompt)
            # Otherwise use local model
            else:
                return self._generate_locally(prompt)
        except Exception as e:
            print(f"Error generating AI analysis: {str(e)}")
            return {
                "error": str(e),
                "career_profile_summary": "Unable to generate profile at this time.",
                "cv_recommendations": "Unable to generate recommendations at this time.",
                "interview_tips": "Unable to generate tips at this time.",
                "skill_development_plan": "Unable to generate plan at this time."
            }
    
    def _format_prompt(self, data):
        """Format questionnaire data into a prompt for the AI model"""
        prompt = f"""
Based on the following career information, provide a comprehensive analysis:

Current Role: {data.get('current_role', 'Not specified')}
Years of Experience: {data.get('years_experience', 'Not specified')}
Key Skills: {data.get('key_skills', 'Not specified')}
Education: {data.get('education', 'Not specified')}
Career Achievements: {data.get('career_achievements', 'Not specified')}
Job Seeking: {data.get('job_seeking', 'Not specified')}
CV Challenges: {data.get('cv_challenges', 'Not specified')}
Interview Challenges: {data.get('interview_challenges', 'Not specified')}
Soft Skills to Improve: {data.get('soft_skills', 'Not specified')}
Career Goals: {data.get('career_goals', 'Not specified')}

Please provide:
1. A career profile summary
2. CV improvement recommendations
3. Interview preparation tips
4. A skill development plan
"""
        return prompt
    
    def _generate_via_api(self, prompt):
        """Generate analysis using the Hugging Face API"""
        headers = {"Authorization": f"Bearer {self.api_key}"}
        payload = {"inputs": prompt, "parameters": {"max_length": 1000}}
        
        response = requests.post(self.api_url, headers=headers, json=payload)
        
        if response.status_code != 200:
            raise Exception(f"API request failed with status code {response.status_code}: {response.text}")
        
        # Parse the response
        result = response.json()
        
        # Extract the generated text
        if isinstance(result, list) and len(result) > 0:
            generated_text = result[0].get('generated_text', '')
        else:
            generated_text = result.get('generated_text', '')
        
        # Process the generated text to extract sections
        return self._process_generated_text(generated_text)
    
    def _generate_locally(self, prompt):
        """Generate analysis using a local Hugging Face model"""
        try:
            # Initialize the text generation pipeline
            generator = pipeline('text-generation', model=self.model_name)
            
            # Generate text
            result = generator(prompt, max_length=1000, num_return_sequences=1)
            
            # Extract the generated text
            generated_text = result[0]['generated_text'] if result else ""
            
            # Process the generated text to extract sections
            return self._process_generated_text(generated_text)
            
        except Exception as e:
            raise Exception(f"Local model generation failed: {str(e)}")
    
    def _process_generated_text(self, text):
        """
        Process the generated text to extract different sections
        
        This is a simplified implementation that would need to be enhanced
        based on the actual output format of the selected model
        """
        # For now, we'll use a simple approach to split the text
        # In a real implementation, you might use more sophisticated parsing
        
        lines = text.split('\n')
        
        # Initialize sections
        career_profile = []
        cv_recommendations = []
        interview_tips = []
        skill_plan = []
        
        # Current section being processed
        current_section = None
        
        # Process each line
        for line in lines:
            if "career profile" in line.lower():
                current_section = "profile"
            elif "cv" in line.lower() and "recommend" in line.lower():
                current_section = "cv"
            elif "interview" in line.lower():
                current_section = "interview"
            elif "skill" in line.lower() and "plan" in line.lower():
                current_section = "skills"
            elif line.strip() and current_section:
                # Add non-empty lines to the current section
                if current_section == "profile":
                    career_profile.append(line)
                elif current_section == "cv":
                    cv_recommendations.append(line)
                elif current_section == "interview":
                    interview_tips.append(line)
                elif current_section == "skills":
                    skill_plan.append(line)
        
        # Combine the lines for each section
        return {
            "career_profile_summary": "\n".join(career_profile).strip(),
            "cv_recommendations": "\n".join(cv_recommendations).strip(),
            "interview_tips": "\n".join(interview_tips).strip(),
            "skill_development_plan": "\n".join(skill_plan).strip(),
            "raw_response": text
        }


# Factory function to get an instance of the AI utility
def get_ai_instance(model_name=None, api_key=None):
    """Get an instance of the HuggingFaceAI utility"""
    return HuggingFaceAI(model_name, api_key)
