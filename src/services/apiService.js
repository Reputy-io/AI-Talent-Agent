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
    const prompt = formatQuestionnairePrompt(questionnaireData);
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
 * @param {Object} questionnaireData - User's questionnaire responses
 * @returns {string} - Formatted prompt
 */
const formatQuestionnairePrompt = (questionnaireData) => {
  // Extract the answers from the questionnaire data
  const answers = questionnaireData.answers || {};
  
  // Create a formatted prompt with all the answers
  let promptText = `You are a professional career advisor and talent agent. Based on the following information about a person, provide a detailed career analysis and advice. Focus on their strengths, areas for improvement, and specific recommendations for their CV/resume and job search strategy.\n\n`;
  
  // Add each answer to the prompt
  Object.entries(answers).forEach(([questionId, answer]) => {
    // Format the question ID to be more readable
    const formattedQuestionId = questionId
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    promptText += `${formattedQuestionId}: ${answer}\n\n`;
  });
  
  // Add specific instructions for the analysis
  promptText += `\nBased on the information above, please provide:\n`;
  promptText += `1. A summary of the person's professional profile\n`;
  promptText += `2. Key strengths and unique selling points\n`;
  promptText += `3. Areas for professional development\n`;
  promptText += `4. Specific recommendations for improving their CV/resume\n`;
  promptText += `5. Job search strategy and potential roles to target\n`;
  promptText += `6. Additional skills or certifications that would enhance their profile\n\n`;
  promptText += `Please provide detailed, actionable advice that is personalized to their specific situation.`;
  
  return promptText;
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
    // Format the chat history for the prompt
    const formattedChatHistory = chatHistory
      .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
    
    // Create a prompt that includes the user's profile information and chat history
    const prompt = formatChatPrompt(message, formattedChatHistory, context);
    
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
 * @param {string} message - User's current message
 * @param {string} chatHistory - Previous chat messages
 * @param {Object} context - User's questionnaire responses and analysis for context
 * @returns {string} - Formatted prompt
 */
const formatChatPrompt = (message, chatHistory, context) => {
  const { answers, analysis } = context || {};
  
  // Format the user profile information from questionnaire answers
  let userProfile = '';
  if (answers) {
    userProfile = Object.entries(answers)
      .map(([key, value]) => `${key.replace(/_/g, ' ')}: ${value}`)
      .join('\n');
  }
  
  // Construct the full prompt with context
  let prompt = `You are an AI talent agent helping a user with their career development. 
  
USER PROFILE INFORMATION:
${userProfile || 'No profile information available.'}

${analysis ? `CAREER ANALYSIS:
${analysis}` : ''}

PREVIOUS CONVERSATION:
${chatHistory || 'This is the start of the conversation.'}

User: ${message}
`;

  return prompt;
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
