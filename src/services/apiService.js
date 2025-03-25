/**
 * API Service for communicating with the Django backend
 * This service handles all API calls to the talent agent backend
 */

const API_BASE_URL = 'http://localhost:8000/api';
const HF_API_URL = 'https://api-inference.huggingface.co/models/deepseek-ai/DeepSeek-R1-Distill-Qwen-32B';
const HF_API_KEY = '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';

/**
 * Submit questionnaire data to the backend and get AI analysis
 * @param {Object} questionnaireData - User's questionnaire responses
 * @returns {Promise} - Promise with the response data
 */
export const submitQuestionnaire = async (questionnaireData) => {
  try {
    // First try to generate analysis directly using Hugging Face API
    try {
      const aiAnalysis = await generateHuggingFaceAnalysis(questionnaireData);
      
      // If successful, combine the analysis with the questionnaire data
      const combinedResponse = {
        ...questionnaireData,
        ai_analysis: aiAnalysis,
      };
      
      // Optionally save to backend
      saveQuestionnaireToBackend(combinedResponse);
      
      return combinedResponse;
    } catch (hfError) {
      console.error('Error with Hugging Face API, falling back to backend:', hfError);
      
      // Fall back to backend if Hugging Face API fails
      const response = await fetch(`${API_BASE_URL}/submit-questionnaire/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(questionnaireData),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      return await response.json();
    }
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    throw error;
  }
};

/**
 * Generate AI analysis using Hugging Face API directly
 * @param {Object} questionnaireData - User's questionnaire responses
 * @returns {Promise<string>} - Promise with the AI analysis text
 */
export const generateHuggingFaceAnalysis = async (questionnaireData) => {
  try {
    // Format the questionnaire data into a prompt for the model
    const prompt = formatAnalysisPrompt(questionnaireData.answers);
    console.log("Sending prompt to Hugging Face:", prompt);
    
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face API error response:", errorText);
      throw new Error(`Hugging Face API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log("Hugging Face API response:", result);
    
    // The API might return different formats, handle both possibilities
    if (Array.isArray(result)) {
      return result[0]?.generated_text || '';
    } else if (result.generated_text) {
      return result.generated_text;
    } else {
      console.warn("Unexpected response format from Hugging Face API:", result);
      return JSON.stringify(result);
    }
  } catch (error) {
    console.error('Error generating analysis with Hugging Face:', error);
    throw error;
  }
};

/**
 * Format questionnaire data into a prompt for the AI model
 * @param {Object} answers - User's questionnaire responses
 * @returns {string} - Formatted prompt
 */
export const formatAnalysisPrompt = (answers) => {
  // Extract relevant information from the answers
  const profile = extractProfileFromAnswers(answers);
  
  return `
You are a professional career coach and talent agent with expertise in providing personalized career advice. 
Please analyze the following information about this individual and provide detailed, actionable advice.

## User Profile Information:
${profile}

## Instructions:
Provide a comprehensive career analysis and advice with the following sections:

### Summary of the Professional Profile
Provide a concise summary of their background, experience, and career goals based on the information provided.

### Key Strengths and Unique Selling Points
Identify 3-5 key strengths and unique qualities that make them stand out in their field.

### Areas for Professional Development
Suggest 3-4 specific areas where they could develop further to enhance their career prospects.

### Specific Recommendations for Improving Their CV/Resume
Provide actionable advice on how to enhance their resume to better showcase their skills and experience.

### Job Search Strategy and Potential Roles to Target
Recommend specific job titles they should consider and strategies for finding opportunities.

### Interview Preparation Advice
Provide tailored advice for common interview questions they might face and how to prepare effectively.

### Long-term Career Development Plan
Suggest a 3-5 year career development roadmap with specific milestones and goals.

Write in a clear, professional tone. Be specific and personalized to their situation rather than generic. Focus on actionable advice that they can implement immediately. Do not include any section numbers or repeat the section titles in your response.
`;
};

/**
 * Save questionnaire and analysis to backend for record-keeping
 * @param {Object} data - Combined questionnaire and analysis data
 */
const saveQuestionnaireToBackend = async (data) => {
  try {
    await fetch(`${API_BASE_URL}/save-questionnaire/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    console.log('Questionnaire saved to backend successfully');
  } catch (error) {
    console.error('Error saving questionnaire to backend:', error);
    // Non-blocking - we don't throw the error as this is a background operation
  }
};

/**
 * Get a specific questionnaire with its AI analysis
 * @param {number} id - Questionnaire ID
 * @returns {Promise} - Promise with the response data
 */
export const getQuestionnaireWithAnalysis = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/questionnaires/${id}/`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching questionnaire ${id}:`, error);
    throw error;
  }
};

/**
 * Trigger AI analysis generation for an existing questionnaire
 * @param {number} id - Questionnaire ID
 * @returns {Promise} - Promise with the response data
 */
export const generateAnalysis = async (id) => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-analysis/${id}/`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error generating analysis for questionnaire ${id}:`, error);
    throw error;
  }
};

/**
 * Send a chat message to the AI using Hugging Face API
 * @param {string} message - User's message
 * @param {Array} chatHistory - Previous chat messages
 * @param {Object} context - User's questionnaire responses and analysis for context
 * @returns {Promise<string>} - Promise with the AI response
 */
export const sendChatMessage = async (message, chatHistory, context) => {
  try {
    // Format the chat history
    const formattedChatHistory = chatHistory.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Career Coach'}: ${msg.content}`
    ).join('\n');
    
    // Create a prompt that includes the user's profile information and chat history
    const prompt = formatChatPrompt(context.userProfile, formattedChatHistory, message);
    
    // Send the prompt to the Hugging Face API
    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 1024,
          temperature: 0.7,
          top_p: 0.95,
          do_sample: true,
          return_full_text: false
        }
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log("AI response data:", data);
    
    // Extract and return the AI's response
    return extractAIResponse(data[0].generated_text);
  } catch (error) {
    console.error("Error sending chat message:", error);
    throw error;
  }
};

/**
 * Helper function to format the chat prompt with context
 * @param {string} userProfile - User's profile information
 * @param {string} chatHistory - Previous chat messages
 * @param {string} newMessage - User's current message
 * @returns {string} - Formatted prompt
 */
export const formatChatPrompt = (userProfile, chatHistory, newMessage) => {
  return `
You are a professional career coach and talent agent with expertise in providing personalized career advice.
You are having a conversation with a user about their career. Be helpful, specific, and provide actionable advice.

## User Profile Information:
${userProfile}

## Previous Conversation:
${chatHistory}

## New Message from User:
${newMessage}

## Instructions:
- Respond directly to the user's question or comment.
- Provide detailed, actionable advice that is personalized to their specific situation.
- Write in a clear, professional tone.
- If they ask about specific career paths, provide insights about required skills, education, and potential growth opportunities.
- If they ask about resume or interview advice, give specific examples and techniques.
- Always maintain a supportive and encouraging tone while being honest and realistic.
- When appropriate, ask follow-up questions to better understand their situation.
- Format your response with clear headings using ### for main sections when appropriate.
- Do not use numbered lists at the start of paragraphs.
- Do not repeat section titles in your response.

Your response should be well-structured, easy to read, and focused on providing value to the user.
`;
};

/**
 * Extract only the AI's response from the complete generated text
 * @param {string} fullResponse - The complete response from the API
 * @returns {string} - Just the AI's response part
 */
const extractAIResponse = (fullResponse) => {
  // If the full response doesn't contain the prompt, return it as is
  if (!fullResponse.includes('User:')) {
    return fullResponse;
  }
  
  // Extract only the part after the prompt
  const aiResponsePart = fullResponse.substring(fullResponse.indexOf('User:') + 5);
  
  // Clean up any trailing conversation markers
  return aiResponsePart.split(/\nUser:/)[0].trim();
};

// Helper function to extract a profile from questionnaire answers
const extractProfileFromAnswers = (answers) => {
  let profile = '';
  
  // Map questions to profile sections
  const questionMappings = {
    'What is your current job title?': 'Current Position',
    'How many years of experience do you have in your field?': 'Experience',
    'What are your top technical skills?': 'Technical Skills',
    'What are your top soft skills?': 'Soft Skills',
    'What industry do you work in or want to work in?': 'Target Industry',
    'What are your short-term career goals (next 1-2 years)?': 'Short-term Goals',
    'What are your long-term career goals (3-5 years)?': 'Long-term Goals',
    'What has been your biggest challenge in past interviews?': 'Interview Challenges',
    'What is your educational background?': 'Education',
    'What specific area of your career would you like advice on?': 'Areas Seeking Advice'
  };
  
  // Build the profile from the answers
  for (const [question, answer] of Object.entries(answers)) {
    const section = questionMappings[question] || question;
    if (answer && answer.trim() !== '') {
      profile += `**${section}**: ${answer}\n`;
    }
  }
  
  return profile;
};
