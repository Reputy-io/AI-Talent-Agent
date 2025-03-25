import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Send, User, Bot, MessageSquare, FileText } from 'lucide-react';
import { submitQuestionnaire, sendChatMessage } from './services/apiService';

const ReputyTalentAgent = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textInput, setTextInput] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [showChat, setShowChat] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  
  // Scroll to bottom of chat when new messages are added
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);
  
  const handleSubmit = async (finalAnswers) => {
    setIsLoading(true);
    setError(null);

    // Prepare the questionnaire data
    const questionnaireData = {
      answers: finalAnswers || answers,
      timestamp: new Date().toISOString(),
    };

    try {
      // Generate AI analysis
      const response = await submitQuestionnaire(questionnaireData);
      console.log("Backend response:", response);

      // Process the AI analysis text from Hugging Face
      if (response.ai_analysis) {
        // Parse the AI analysis text into structured sections
        const processedAnalysis = processAiAnalysisText(response.ai_analysis);
        setAiAnalysis(processedAnalysis);
      } else {
        setAiAnalysis({
          raw_text: "No analysis was generated. Please try again.",
          sections: {}
        });
      }
      
      // Add an initial welcome message from the AI for the chat interface
      const initialMessage = {
        role: 'assistant',
        content: "Thank you for completing the questionnaire! I'm your AI talent agent, and I'm here to help with your career questions. I've analyzed your profile information and I'm ready to provide personalized advice. What would you like to know about your career development?",
        timestamp: new Date().toISOString()
      };
      
      setChatMessages([initialMessage]);
      setIsSubmitted(true);
      setShowChat(false); // Start with the analysis view
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      setError("Failed to submit questionnaire. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to process the raw AI analysis text into structured sections
  const processAiAnalysisText = (rawText) => {
    // Initialize the structured analysis object
    const structuredAnalysis = {
      raw_text: rawText,
      sections: {}
    };

    // Define section markers to look for in the text
    const sectionMarkers = [
      { id: 'professional_profile', patterns: ['professional profile', 'summary', 'profile summary'] },
      { id: 'key_strengths', patterns: ['key strengths', 'strengths', 'unique selling points', 'selling points'] },
      { id: 'areas_for_development', patterns: ['areas for', 'professional development', 'improvement areas', 'weaknesses'] },
      { id: 'cv_recommendations', patterns: ['cv recommendations', 'resume recommendations', 'improving their cv', 'cv/resume'] },
      { id: 'job_search_strategy', patterns: ['job search strategy', 'potential roles', 'target roles', 'job search'] },
      { id: 'additional_skills', patterns: ['additional skills', 'certifications', 'enhance their profile', 'further education'] }
    ];

    // Split the text by numbered sections or headings
    const lines = rawText.split('\n');
    let currentSection = null;
    let currentContent = [];

    // Process each line to identify sections
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Check if this line starts a new section
      let foundSection = false;
      for (const marker of sectionMarkers) {
        // Check for numbered points (like "1. Professional Profile")
        const numberedPattern = new RegExp(`^\\d+\\.\\s*(${marker.patterns.join('|')})`, 'i');
        // Check for headings (like "Professional Profile:")
        const headingPattern = new RegExp(`^(${marker.patterns.join('|')})\\s*:?\\s*$`, 'i');
        
        if (numberedPattern.test(line) || headingPattern.test(line)) {
          // If we were building a previous section, save it
          if (currentSection && currentContent.length > 0) {
            structuredAnalysis.sections[currentSection] = currentContent.join('\n').trim();
            currentContent = [];
          }
          
          currentSection = marker.id;
          foundSection = true;
          break;
        }
      }
      
      // If this line doesn't start a new section, add it to the current section content
      if (!foundSection) {
        currentContent.push(line);
      }
    }
    
    // Save the last section if there is one
    if (currentSection && currentContent.length > 0) {
      structuredAnalysis.sections[currentSection] = currentContent.join('\n').trim();
    }
    
    // If no sections were found, put everything in a general section
    if (Object.keys(structuredAnalysis.sections).length === 0) {
      structuredAnalysis.sections.general = rawText.trim();
    }
    
    return structuredAnalysis;
  };

  // Handle sending a chat message
  const handleSendMessage = async () => {
    if (chatInput.trim() === '') return;
    
    // Add user message to chat
    const userMessage = {
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString()
    };
    
    setChatMessages(prevMessages => [...prevMessages, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      // Send message to AI with both questionnaire answers and analysis as context
      const aiResponse = await sendChatMessage(
        userMessage.content,
        chatMessages,
        { 
          answers: answers,
          analysis: aiAnalysis?.raw_text
        }
      );
      
      // Add AI response to chat
      const aiMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prevMessages => [...prevMessages, aiMessage]);
    } catch (err) {
      console.error("Error sending chat message:", err);
      
      // Add error message to chat
      const errorMessage = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error processing your message. Please try again.",
        isError: true,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle pressing Enter to send a message
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNext = () => {
    if (textInput.trim() === '') return;

    // Save the current answer
    const updatedAnswers = {
      ...answers,
      [questions[currentStep].id]: textInput
    };
    setAnswers(updatedAnswers);
    setTextInput('');

    // Check if this is the last question
    if (currentStep === questions.length - 1) {
      // Show loading screen immediately and submit the questionnaire
      setIsLoading(true);
      handleSubmit(updatedAnswers);
    } else {
      // Move to the next question
      setCurrentStep(currentStep + 1);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (textInput.trim() !== '') {
        handleNext();
      }
    }
  };

  const handleSkip = () => {
    // Move to the next question without saving an answer
    if (currentStep === questions.length - 1) {
      // Show loading screen immediately and submit the questionnaire
      setIsLoading(true);
      handleSubmit(answers);
    } else {
      setCurrentStep(currentStep + 1);
    }
    setTextInput('');
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Theme-based styles
  const themeStyles = {
    background: darkMode 
      ? 'bg-gradient-to-br from-purple-950 via-fuchsia-900 to-indigo-900' 
      : 'bg-gradient-to-br from-purple-100 via-white to-indigo-100',
    text: darkMode ? 'text-white' : 'text-gray-800',
    subtext: darkMode ? 'text-gray-300' : 'text-gray-600',
    mutedText: darkMode ? 'text-gray-400' : 'text-gray-500',
    card: darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-white bg-opacity-80',
    cardBorder: darkMode ? 'border-purple-700' : 'border-indigo-200',
    input: darkMode 
      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' 
      : 'bg-white border-purple-300 text-gray-800 placeholder-gray-400',
    buttonPrimary: darkMode 
      ? 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white' 
      : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
    buttonSecondary: darkMode 
      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
      : 'bg-purple-100 hover:bg-purple-200 text-indigo-800',
    link: darkMode ? 'text-fuchsia-400 hover:text-fuchsia-300' : 'text-fuchsia-600 hover:text-fuchsia-700',
    divider: darkMode ? 'border-purple-800' : 'border-indigo-300',
    progressActive: darkMode ? 'bg-fuchsia-500' : 'bg-fuchsia-600',
    progressComplete: darkMode ? 'bg-green-500' : 'bg-green-600',
    progressInactive: darkMode ? 'bg-gray-600' : 'bg-indigo-200'
  };

  const questions = [
    {
      id: 'current_role',
      question: 'What is your current role or most recent position?',
      placeholder: 'E.g., Marketing Manager at XYZ Corp, Software Engineer, Recent Graduate...'
    },
    {
      id: 'years_experience',
      question: 'How many years of professional experience do you have?',
      placeholder: 'E.g., 2 years, 5+ years, Entry-level...'
    },
    {
      id: 'key_skills',
      question: 'What are your top 3-5 professional skills or competencies?',
      placeholder: 'E.g., Project Management, Python, Data Analysis, Content Creation...'
    },
    {
      id: 'education',
      question: 'What is your educational background?',
      placeholder: 'Degrees, certifications, or relevant training...'
    },
    {
      id: 'career_achievements',
      question: 'What are 2-3 of your most significant career achievements?',
      placeholder: 'Projects completed, awards, improvements you made...'
    },
    {
      id: 'job_seeking',
      question: 'What type of role are you currently looking for?',
      placeholder: 'Specific job titles, industries, or company types...'
    },
    {
      id: 'cv_challenges',
      question: 'What aspects of your CV or resume do you feel need improvement?',
      placeholder: 'E.g., highlighting achievements, addressing gaps, formatting...'
    },
    {
      id: 'interview_challenges',
      question: 'What has been your biggest challenge in past interviews?',
      placeholder: 'E.g., behavioral questions, technical assessments, salary negotiation...'
    },
    {
      id: 'soft_skills',
      question: 'Which soft skills would you like to improve for your career progression?',
      placeholder: 'E.g., communication, leadership, conflict resolution, public speaking...'
    },
    {
      id: 'career_goals',
      question: 'What are your primary career goals for the next 12 months?',
      placeholder: 'Share your professional aspirations and targets...'
    }
  ];

  return (
    <div className={`min-h-screen ${themeStyles.background} ${themeStyles.text} font-sans transition-colors duration-300`}>
      {/* Navigation Bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <div className="mr-6">
            <div className="flex items-center">
              <div className="w-12 h-12 relative">
                <div className="absolute w-4 h-4 bg-purple-500 rounded-full top-1 left-1"></div>
                <div className="absolute w-4 h-4 bg-blue-400 rounded-full top-1 right-1"></div>
                <div className="absolute w-4 h-4 bg-pink-400 rounded-full bottom-1 left-1"></div>
              </div>
              <span className={`ml-2 text-xl font-bold ${themeStyles.text}`}>Reputy.io Talent Agent</span>
            </div>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className={`hover:${themeStyles.link}`}>Products</a>
            <a href="#" className={`hover:${themeStyles.link}`}>Use Cases</a>
            <a href="#" className={`hover:${themeStyles.link}`}>Tutorial</a>
            <a href="#" className={`hover:${themeStyles.link}`}>Community</a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-blue-100 text-indigo-600'}`}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <a href="#" className={`hover:${themeStyles.link}`}>About</a>
          <a href="#" className={`hover:${themeStyles.link}`}>Login</a>
          <button className={`${themeStyles.buttonPrimary} px-6 py-2 rounded-md`}>
            Try For Free
          </button>
        </div>
      </header>

      {/* Breadcrumb Navigation */}
      <div className="px-6 py-4">
        <div className="flex items-center space-x-2 text-sm">
          <a href="#" className={themeStyles.link}>Home</a>
          <span className={themeStyles.mutedText}>&gt;</span>
          <a href="#" className={themeStyles.link}>Tools</a>
          <span className={themeStyles.mutedText}>&gt;</span>
          <span className={themeStyles.mutedText}>Career Questionnaire</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">Reputy.io Talent Agent</h1>
          <p className={`text-xl mb-6 ${themeStyles.subtext}`}>
            Complete your career profile to get personalized CV feedback and interview coaching
          </p>

          {!isSubmitted ? (
            <>
              {/* Show full-screen loading overlay when processing final submission */}
              {isLoading && (
                <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-gray-900 bg-opacity-70 backdrop-blur-sm">
                  <div className={`${themeStyles.card} p-8 rounded-xl shadow-2xl max-w-md mx-auto text-center`}>
                    <div className="w-24 h-24 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                    <h3 className="text-2xl font-bold mb-4">Analyzing Your Responses</h3>
                    <p className="mb-2">Your AI talent agent is generating personalized career insights...</p>
                    <p className="text-sm opacity-75">This may take up to 30 seconds.</p>
                    
                    {/* Loading progress animation */}
                    <div className="mt-6 h-2 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full animate-pulse" 
                           style={{width: '100%'}}></div>
                    </div>
                  </div>
                </div>
              )}
            
              {/* Progress Indicator */}
              <div className="flex justify-center mb-6 overflow-x-auto py-2">
                <div className="flex space-x-1">
                  {questions.map((_, index) => (
                    <div 
                      key={index} 
                      className={`w-2 h-2 mx-1 rounded-full ${
                        index === currentStep ? themeStyles.progressActive : 
                        index < currentStep ? themeStyles.progressComplete : themeStyles.progressInactive
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Question Display */}
              <div className={`${themeStyles.card} rounded-lg p-6 mb-6 text-left border ${themeStyles.cardBorder} backdrop-blur-sm max-w-2xl mx-auto`}>
                <h2 className="text-2xl font-semibold mb-4">
                  {questions[currentStep].question}
                </h2>
                <div className="relative">
                  <textarea 
                    className={`w-full p-4 rounded-lg ${themeStyles.input} focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
                    placeholder={questions[currentStep].placeholder}
                    rows={4}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div className="mt-6 flex justify-between items-center">
                  <div>
                    <span className={`${themeStyles.mutedText} text-sm`}>
                      Question {currentStep + 1} of {questions.length}
                    </span>
                  </div>
                  <button 
                    onClick={handleNext}
                    className={`${themeStyles.buttonPrimary} px-6 py-2 rounded-md flex items-center`}
                    disabled={textInput.trim() === ''}
                  >
                    {currentStep < questions.length - 1 ? 'Next' : (
                      isLoading ? (
                        <div className="flex items-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          <span>Processing...</span>
                        </div>
                      ) : 'Submit'
                    )}
                  </button>
                </div>
              </div>

              <p className={`${themeStyles.mutedText} mt-4 text-sm`}>
                Press Enter to submit your answer and continue
              </p>

              {/* Skip option for optional questions */}
              <button 
                className={`${themeStyles.mutedText} hover:${themeStyles.link} mt-4 text-sm underline`}
                onClick={handleSkip}
              >
                Skip this question
              </button>
            </>
          ) : (
            <>
              {/* View Toggle Buttons */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                      !showChat 
                        ? `${darkMode ? 'bg-fuchsia-600' : 'bg-fuchsia-500'} text-white` 
                        : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-white' : 'text-gray-700'}`
                    }`}
                    onClick={() => setShowChat(false)}
                  >
                    <FileText className="inline-block mr-2" size={18} />
                    Analysis Report
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                      showChat 
                        ? `${darkMode ? 'bg-fuchsia-600' : 'bg-fuchsia-500'} text-white` 
                        : `${darkMode ? 'bg-gray-700' : 'bg-gray-200'} ${darkMode ? 'text-white' : 'text-gray-700'}`
                    }`}
                    onClick={() => setShowChat(true)}
                  >
                    <MessageSquare className="inline-block mr-2" size={18} />
                    Chat with AI
                  </button>
                </div>
              </div>

              {showChat ? (
                // Chat Interface
                <div className={`${themeStyles.card} rounded-lg p-6 mb-6 text-left border ${themeStyles.cardBorder} backdrop-blur-sm max-w-4xl mx-auto`}>
                  <h2 className="text-3xl font-bold mb-6 text-center">Chat with Your AI Talent Agent</h2>
                  
                  {/* Chat Messages */}
                  <div className="h-[400px] overflow-y-auto mb-4 p-4 rounded-lg border border-gray-300 bg-opacity-50 bg-gray-100 dark:bg-gray-800">
                    {chatMessages.length === 0 ? (
                      <div className="flex items-center justify-center h-full">
                        <p className={`${themeStyles.mutedText} text-center`}>
                          Your conversation will appear here. Start by asking a question about your career.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {chatMessages.map((message, index) => (
                          <div 
                            key={index} 
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div 
                              className={`max-w-[80%] p-3 rounded-lg ${
                                message.role === 'user' 
                                  ? `${darkMode ? 'bg-fuchsia-700' : 'bg-fuchsia-500'} text-white` 
                                  : message.isError 
                                    ? `${darkMode ? 'bg-red-900' : 'bg-red-100'} ${darkMode ? 'text-red-100' : 'text-red-900'}`
                                    : `${darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} ${darkMode ? 'text-white' : 'text-gray-800'}`
                              }`}
                            >
                              <div className="flex items-center mb-1">
                                <span className="mr-2">
                                  {message.role === 'user' ? (
                                    <User size={16} />
                                  ) : (
                                    <Bot size={16} />
                                  )}
                                </span>
                                <span className="font-semibold">
                                  {message.role === 'user' ? 'You' : 'AI Talent Agent'}
                                </span>
                              </div>
                              <p className="whitespace-pre-line">{message.content}</p>
                            </div>
                          </div>
                        ))}
                        {/* Show typing indicator when AI is generating a response */}
                        {isChatLoading && (
                          <div className="flex justify-start">
                            <div className={`max-w-[80%] p-3 rounded-lg ${darkMode ? 'bg-indigo-900' : 'bg-indigo-100'} ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              <div className="flex items-center mb-1">
                                <span className="mr-2">
                                  <Bot size={16} />
                                </span>
                                <span className="font-semibold">
                                  AI Talent Agent
                                </span>
                              </div>
                              <div className="flex space-x-1 items-center h-6">
                                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-200 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-200 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-200 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>
                    )}
                  </div>
                  
                  {/* Chat Input */}
                  <div className="relative">
                    <textarea
                      className={`w-full p-3 pr-12 rounded-lg resize-none border ${themeStyles.input} focus:outline-none focus:ring-2 focus:ring-fuchsia-500`}
                      placeholder="Ask me anything about your career..."
                      rows="3"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={isChatLoading}
                    />
                    <button
                      className={`absolute right-3 bottom-3 p-2 rounded-full ${themeStyles.buttonPrimary} disabled:opacity-50`}
                      onClick={handleSendMessage}
                      disabled={isChatLoading || chatInput.trim() === ''}
                    >
                      {isChatLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                // Analysis Display
                <div className="mt-8">
                  {isLoading ? (
                    // Full-screen loading indicator
                    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-gray-900 bg-opacity-70 backdrop-blur-sm">
                      <div className={`${themeStyles.card} p-8 rounded-xl shadow-2xl max-w-md mx-auto text-center`}>
                        <div className="w-24 h-24 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                        <h3 className="text-2xl font-bold mb-4">Analyzing Your Responses</h3>
                        <p className="mb-2">Your AI talent agent is generating personalized career insights...</p>
                        <p className="text-sm opacity-75">This may take up to 30 seconds.</p>
                        
                        {/* Loading progress animation */}
                        <div className="mt-6 h-2 w-full bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
                          <div className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full animate-pulse" 
                               style={{width: '100%'}}></div>
                        </div>
                      </div>
                    </div>
                  ) : error ? (
                    <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900' : 'bg-red-100'} border ${darkMode ? 'border-red-700' : 'border-red-400'} ${darkMode ? 'text-red-200' : 'text-red-700'} mb-6`}>
                      <h3 className="font-bold text-lg mb-2">Error</h3>
                      <p>{error}</p>
                      <button 
                        className={`${themeStyles.buttonPrimary} px-4 py-2 rounded-md mt-4`}
                        onClick={() => handleSubmit(answers)}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : aiAnalysis ? (
                    <div className="space-y-8">
                      <h2 className="text-3xl font-bold mb-6 text-center">Your Career Analysis</h2>
                      
                      {/* Professional Profile */}
                      <div>
                        <h3 className="text-2xl font-semibold mb-3 text-fuchsia-500">Professional Profile Summary</h3>
                        <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                          <p className="whitespace-pre-line">
                            {aiAnalysis.sections.professional_profile || 
                             aiAnalysis.sections.general || 
                             "No professional profile summary available."}
                          </p>
                        </div>
                      </div>
                      
                      {/* Key Strengths */}
                      {(aiAnalysis.sections.key_strengths || aiAnalysis.sections.general) && (
                        <div>
                          <h3 className="text-2xl font-semibold mb-3 text-fuchsia-500">Key Strengths & Unique Selling Points</h3>
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                            <p className="whitespace-pre-line">
                              {aiAnalysis.sections.key_strengths || 
                               (aiAnalysis.sections.general ? "Please see the general analysis above." : "No strengths analysis available.")}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Areas for Development */}
                      {(aiAnalysis.sections.areas_for_development || aiAnalysis.sections.general) && (
                        <div>
                          <h3 className="text-2xl font-semibold mb-3 text-fuchsia-500">Areas for Professional Development</h3>
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                            <p className="whitespace-pre-line">
                              {aiAnalysis.sections.areas_for_development || 
                               (aiAnalysis.sections.general ? "Please see the general analysis above." : "No development areas analysis available.")}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* CV Recommendations */}
                      {(aiAnalysis.sections.cv_recommendations || aiAnalysis.sections.general) && (
                        <div>
                          <h3 className="text-2xl font-semibold mb-3 text-fuchsia-500">CV Improvement Recommendations</h3>
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                            <p className="whitespace-pre-line">
                              {aiAnalysis.sections.cv_recommendations || 
                               (aiAnalysis.sections.general ? "Please see the general analysis above." : "No CV recommendations available.")}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Job Search Strategy */}
                      {(aiAnalysis.sections.job_search_strategy || aiAnalysis.sections.general) && (
                        <div>
                          <h3 className="text-2xl font-semibold mb-3 text-fuchsia-500">Job Search Strategy</h3>
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                            <p className="whitespace-pre-line">
                              {aiAnalysis.sections.job_search_strategy || 
                               (aiAnalysis.sections.general ? "Please see the general analysis above." : "No job search strategy available.")}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Additional Skills */}
                      {(aiAnalysis.sections.additional_skills || aiAnalysis.sections.general) && (
                        <div>
                          <h3 className="text-2xl font-semibold mb-3 text-fuchsia-500">Recommended Skills & Certifications</h3>
                          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                            <p className="whitespace-pre-line">
                              {aiAnalysis.sections.additional_skills || 
                               (aiAnalysis.sections.general ? "Please see the general analysis above." : "No additional skills recommendations available.")}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {/* Chat with AI Button */}
                      <div className="flex justify-center mt-8">
                        <button 
                          className={`${themeStyles.buttonPrimary} px-6 py-4 rounded-md text-lg flex items-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                          onClick={() => setShowChat(true)}
                        >
                          <MessageSquare className="mr-2" size={24} />
                          Chat with Your AI Talent Agent
                        </button>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="flex justify-center space-x-4 mt-6">
                        <button 
                          className={`${themeStyles.buttonSecondary} px-6 py-3 rounded-md`}
                          onClick={() => {
                            // Download functionality
                            const element = document.createElement("a");
                            const file = new Blob([
                              `# Career Analysis Report\n\n` +
                              `## Professional Profile\n${aiAnalysis.sections.professional_profile || aiAnalysis.sections.general || "No data"}\n\n` +
                              `## Key Strengths\n${aiAnalysis.sections.key_strengths || "No data"}\n\n` +
                              `## Areas for Development\n${aiAnalysis.sections.areas_for_development || "No data"}\n\n` +
                              `## CV Recommendations\n${aiAnalysis.sections.cv_recommendations || "No data"}\n\n` +
                              `## Job Search Strategy\n${aiAnalysis.sections.job_search_strategy || "No data"}\n\n` +
                              `## Recommended Skills\n${aiAnalysis.sections.additional_skills || "No data"}\n\n` +
                              `\nGenerated by Reputy.io Talent Agent on ${new Date().toLocaleDateString()}`
                            ], { type: 'text/plain' });
                            element.href = URL.createObjectURL(file);
                            element.download = "career-analysis-report.md";
                            document.body.appendChild(element);
                            element.click();
                            document.body.removeChild(element);
                          }}
                        >
                          Download Analysis
                        </button>
                        <button 
                          className={`${themeStyles.buttonSecondary} px-6 py-3 rounded-md`}
                          onClick={() => {
                            setIsSubmitted(false);
                            setCurrentStep(0);
                            setAnswers({});
                            setTextInput('');
                            setAiAnalysis(null);
                            setChatMessages([]);
                            setChatInput('');
                            setShowChat(false);
                          }}
                        >
                          Start New Assessment
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p>No analysis data available.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Social Proof */}
      <div className="mt-20 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Trusted by professionals from leading companies</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center items-center">
            {/* Company logos would go here */}
            <div className={`${themeStyles.mutedText} text-xl font-bold`}>Company 1</div>
            <div className={`${themeStyles.mutedText} text-xl font-bold`}>Company 2</div>
            <div className={`${themeStyles.mutedText} text-xl font-bold`}>Company 3</div>
            <div className={`${themeStyles.mutedText} text-xl font-bold`}>Company 4</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`mt-20 px-6 py-12 border-t ${themeStyles.divider}`}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4">Reputy.io Talent Agent</h3>
            <p className={`${themeStyles.mutedText} mb-4`}>
              AI-powered career coaching to help you land your dream job.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-4">Products</h4>
            <ul className="space-y-2">
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>CV Analysis</a></li>
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Interview Coach</a></li>
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Career Planner</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Blog</a></li>
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Guides</a></li>
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Support</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>About</a></li>
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Careers</a></li>
              <li><a href="#" className={`${themeStyles.mutedText} hover:${themeStyles.link}`}>Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 text-center">
          <p className={themeStyles.mutedText}>&copy; 2025 Reputy.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ReputyTalentAgent;
