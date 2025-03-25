import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Send, User, Bot, MessageSquare, FileText, MessageCircle, ArrowLeft, ArrowRight } from 'lucide-react';
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
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI talent agent. I\'ve analyzed your profile and can help with specific questions about your career development. What would you like to know?' }
  ]);
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

  // Function to format the analysis text with proper markdown
  const formatAnalysisText = (text) => {
    if (!text) return '';
    
    // Define all section headers that should be in the final output
    const sectionHeaders = [
      'Summary of the Professional Profile',
      'Key Strengths and Unique Selling Points',
      'Areas for Professional Development',
      'Specific Recommendations for Improving Their CV/Resume',
      'Job Search Strategy and Potential Roles to Target',
      'Interview Preparation Advice',
      'Long-term Career Development Plan'
    ];
    
    // Extract sections with actual content
    const extractedSections = {};
    
    // First, clean up the text by removing prompt instructions
    const promptPatterns = [
      // Prompt headers and instructions
      /You are a professional career coach and talent agent[\s\S]*?following sections:/g,
      /User Profile Information:[\s\S]*?Instructions:/g,
      /Provide a comprehensive career analysis[\s\S]*?sections:/g,
      /Career Analysis and Advice/g,
      /Instructions:/g,
      /Please analyze the following information[\s\S]*?advice\./g,
      /Your Career Analysis/g,
      
      // Section descriptions from the prompt template
      /Provide a concise summary of their background[^\n]*\./g,
      /Identify 3-5 key strengths[^\n]*\./g,
      /Suggest 3-4 specific areas[^\n]*\./g,
      /Provide actionable advice[^\n]*\./g,
      /Recommend specific job titles[^\n]*\./g,
      /Provide tailored advice for[^\n]*\./g,
      /Suggest a 3-5 year career[^\n]*\./g,
      
      // Additional prompt elements that might appear
      /Write in a clear, professional tone\./g,
      /Be specific and personalized[^\n]*\./g,
      /Focus on actionable advice[^\n]*\./g,
      /Do not include any section numbers[^\n]*\./g
    ];
    
    // Apply all cleaning patterns
    let cleanedText = text;
    for (const pattern of promptPatterns) {
      cleanedText = cleanedText.replace(pattern, '');
    }
    
    // Remove markdown formatting artifacts
    cleanedText = cleanedText
      .replace(/^\s*#\s*/gm, '') // Remove standalone # characters
      .replace(/^\s*##\s*/gm, '') // Remove ## headers
      .replace(/^\s*\d+\.\s*/gm, ''); // Remove numbered lists at the start of lines
    
    // Find the last occurrence of each section header and extract content after it
    for (const section of sectionHeaders) {
      // Find all occurrences of this section
      let lastIndex = -1;
      let index = cleanedText.indexOf(section);
      
      while (index !== -1) {
        lastIndex = index;
        index = cleanedText.indexOf(section, lastIndex + 1);
      }
      
      if (lastIndex !== -1) {
        // Find the end of this section (start of next section or end of text)
        let sectionEnd = cleanedText.length;
        for (const nextSection of sectionHeaders) {
          if (nextSection !== section) {
            const nextSectionIndex = cleanedText.indexOf(nextSection, lastIndex + section.length);
            if (nextSectionIndex !== -1 && nextSectionIndex < sectionEnd) {
              sectionEnd = nextSectionIndex;
            }
          }
        }
        
        // Extract the content for this section
        const sectionContent = cleanedText.substring(lastIndex + section.length, sectionEnd).trim();
        
        // Only save if there's actual content (not just whitespace or empty)
        if (sectionContent && !/^\s*$/.test(sectionContent)) {
          extractedSections[section] = sectionContent;
        }
      }
    }
    
    // Build the final formatted text with only sections that have content
    let formattedText = '';
    
    // Add each section with content in the correct order
    for (const section of sectionHeaders) {
      if (extractedSections[section]) {
        // Add the styled header
        formattedText += `<h2 class="text-2xl font-bold mt-8 mb-4 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'} border-b ${darkMode ? 'border-indigo-700' : 'border-indigo-300'} pb-2">${section}</h2>\n`;
        
        // Add the content with proper formatting
        let content = extractedSections[section];
        
        // Format bullet points
        content = content.replace(/^\s*-\s*(.*)/gm, `<li class="ml-5 list-disc mb-2 ${darkMode ? '' : 'text-gray-800'}">$1</li>`);
        
        // Format numbered lists
        content = content.replace(/^\s*\d+\.\s*(.*)/gm, `<li class="ml-5 list-decimal mb-2 ${darkMode ? '' : 'text-gray-800'}">$1</li>`);
        
        // Format bold text
        content = content.replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}">$1</strong>`);
        
        // Add the formatted content
        formattedText += content + '\n\n';
      }
    }
    
    // Format any remaining markdown elements
    formattedText = formattedText
      // Handle any remaining headers
      .replace(/## (.*)/g, '<h3 class="text-xl font-bold mt-6 mb-3 text-indigo-300">$1</h3>')
      .replace(/### (.*)/g, '<h4 class="text-lg font-semibold mt-5 mb-2 text-indigo-200">$1</h4>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="my-3">')
      .replace(/\n/g, '<br/>');
    
    // Wrap in paragraph tags
    formattedText = '<p class="my-3">' + formattedText + '</p>';
    
    return formattedText;
  };
  
  // Function to format chat messages with proper markdown
  const formatChatMessage = (text) => {
    if (!text) return '';
    
    // Remove any redundant headers or formatting that might come from the API
    let cleanedText = text
      .replace(/^\s*#\s*/gm, '') // Remove standalone # characters
      .replace(/^\s*##\s*/gm, '') // Remove ## headers
      .replace(/^\s*\d+\.\s*/gm, ''); // Remove numbered lists at the start of lines
    
    // Replace markdown headers with styled elements
    let formattedText = cleanedText
      // Handle headers
      .replace(/## (.*)/g, `<h3 class="text-lg font-bold mt-4 mb-2 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}">$1</h3>`)
      .replace(/### (.*)/g, `<h4 class="text-base font-bold mt-3 mb-2 ${darkMode ? 'text-indigo-300' : 'text-indigo-700'}">$1</h4>`)
      // Format lists
      .replace(/- (.*)/g, `<li class="ml-4 list-disc mb-1 ${darkMode ? '' : 'text-gray-800'}">$1</li>`)
      .replace(/\d+\. (.*)/g, `<li class="ml-4 list-decimal mb-1 ${darkMode ? '' : 'text-gray-800'}">$1</li>`)
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, `<strong class="font-semibold ${darkMode ? 'text-indigo-200' : 'text-indigo-700'}">$1</strong>`)
      // Paragraphs
      .replace(/\n\n/g, `</p><p class="my-2 ${darkMode ? '' : 'text-gray-800'}">`)
      .replace(/\n/g, '<br/>');
    
    // Wrap in paragraph tags
    formattedText = `<p class="my-2 ${darkMode ? '' : 'text-gray-800'}">` + formattedText + '</p>';
    
    return formattedText;
  };

  // Component to display the analysis with proper formatting
  const AnalysisDisplay = ({ analysis }) => {
    return (
      <div className={`${themeStyles.card} rounded-lg p-8 border ${themeStyles.cardBorder} backdrop-blur-sm max-w-4xl mx-auto`}>
        <h1 className={`text-3xl font-bold mb-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>Your Career Analysis</h1>
        
        <div className="overflow-auto" style={{ maxHeight: '70vh' }}>
          <div 
            className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none`}
            dangerouslySetInnerHTML={{ __html: formatAnalysisText(analysis) }}
          />
        </div>
        
        <div className="mt-10 flex justify-center">
          <button 
            onClick={() => setShowChat(true)}
            className={`${themeStyles.buttonPrimary} px-6 py-3 rounded-md flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all`}
          >
            <MessageCircle size={20} />
            <span>Chat with Your Talent Agent</span>
          </button>
        </div>
      </div>
    );
  };

  // Chat component with improved styling
  const ChatInterface = ({ analysis, onBack, messages, onSendMessage, isTyping }) => {
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    
    // Scroll to bottom of chat when messages change
    useEffect(() => {
      scrollToBottom();
    }, [messages]);
    
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleSendMessage = async () => {
      if (input.trim() === '') return;
      
      const userMessage = input.trim();
      setInput('');
      
      // Get answers from context
      const context = {
        userProfile: extractUserProfile(),
        analysis: analysis
      };
      
      // Send message to parent component to handle
      await onSendMessage(userMessage, context);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };
    
    const extractUserProfile = () => {
      // Extract user profile from answers for context
      return Object.entries(answers)
        .map(([question, answer]) => `${question}: ${answer}`)
        .join('\n');
    };
    
    return (
      <div className={`${themeStyles.card} rounded-lg border ${themeStyles.cardBorder} backdrop-blur-sm max-w-4xl mx-auto h-[80vh] flex flex-col`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold">Chat with Your Talent Agent</h2>
          <button 
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-700"
          >
            <ArrowLeft size={20} />
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => (
            <div 
              key={index} 
              className={`flex items-start space-x-2 ${msg.role === 'user' ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}
            >
              {/* Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-indigo-600' : themeStyles.cardBorder}`}>
                <img
                  src={msg.role === 'user' ? '/user-icon.svg' : '/bot-icon.svg'}
                  alt={msg.role === 'user' ? 'User' : 'AI'}
                  className="w-5 h-5"
                  style={{ filter: msg.role === 'user' ? 'brightness(0) invert(1)' : '' }}
                />
              </div>
              
              {/* Message */}
              <div 
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white' 
                    : `${themeStyles.card} border ${themeStyles.cardBorder}`
                }`}
              >
                <div className={`prose ${darkMode ? 'prose-invert' : ''} max-w-none text-sm`}>
                  {msg.role === 'assistant' 
                    ? <div dangerouslySetInnerHTML={{ __html: formatChatMessage(msg.content) }} />
                    : msg.content
                  }
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex items-start space-x-2">
              {/* Bot Icon */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${themeStyles.cardBorder}`}>
                <img
                  src="/bot-icon.svg"
                  alt="AI"
                  className="w-5 h-5"
                />
              </div>
              
              {/* Typing Indicator */}
              <div className={`${themeStyles.card} border ${themeStyles.cardBorder} rounded-lg p-3`}>
                <div className="flex space-x-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="flex space-x-2">
            <textarea
              className={`flex-grow p-3 rounded-lg ${themeStyles.input} focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none`}
              placeholder="Type your message..."
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              className={`${themeStyles.buttonPrimary} px-4 rounded-lg flex items-center justify-center`}
              onClick={handleSendMessage}
              disabled={input.trim() === '' || isTyping}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    );
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

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
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

  // Theme styles based on dark/light mode
  const themeStyles = {
    // Background styles
    background: darkMode 
      ? 'purple-gradient-bg' 
      : 'light-gradient-bg',
    
    // Gradient backgrounds
    gradientBg: darkMode 
      ? 'purple-gradient-bg' 
      : 'light-gradient-bg',
    
    // Header gradient
    headerGradient: darkMode 
      ? 'bg-gradient-to-r from-purple-800 to-purple-900' 
      : 'bg-gradient-to-r from-indigo-500 to-purple-400',
    
    // Card styles
    card: darkMode 
      ? 'bg-gray-900 bg-opacity-40 text-white' 
      : 'bg-white text-gray-800 shadow-sm',
    
    cardBorder: darkMode 
      ? 'border-purple-800 border-opacity-30' 
      : 'border-indigo-100',
    
    // Text colors
    text: darkMode 
      ? 'text-white' 
      : 'text-gray-900',
    
    mutedText: darkMode 
      ? 'text-gray-300' 
      : 'text-indigo-900',
    
    // Button styles
    buttonPrimary: darkMode 
      ? 'button-gradient-dark hover:opacity-90 text-white' 
      : 'button-gradient-light hover:opacity-90 text-white',
    
    buttonSecondary: darkMode 
      ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700' 
      : 'bg-white hover:bg-gray-100 text-indigo-700 border border-indigo-200',
    
    // Input styles
    input: darkMode 
      ? 'input-gradient-dark border-gray-700 text-white placeholder-gray-400' 
      : 'input-gradient-light border-indigo-100 text-gray-800 placeholder-gray-500',
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
    <div className={`min-h-screen ${themeStyles.gradientBg}`}>
      {/* Header with logo and dark mode toggle */}
      <header className={`${themeStyles.headerGradient} py-4 px-6 shadow-lg`}>
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white">Reputy.io</h1>
            <span className="text-sm bg-white bg-opacity-20 px-2 py-1 rounded text-white">Talent Agent</span>
          </div>
          <div className="flex items-center space-x-6">
            <nav className="flex items-center space-x-6">
              <button className={`${darkMode ? 'button-gradient-dark' : 'button-gradient-light'} hover:opacity-90 text-white px-4 py-2 rounded-md`}>
                Log In
              </button>
              <button className="border-2 border-white hover:bg-white hover:bg-opacity-10 text-white px-4 py-2 rounded-md transition-colors">
                Sign Up
              </button>
            </nav>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 transition-colors ml-2"
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun className="text-white" size={20} /> : <Moon className="text-white" size={20} />}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">


        {/* Main Content */}
        <div className="max-w-4xl mx-auto text-center">
          <h1 className={`text-5xl font-bold mb-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Reputy.io Talent Agent</h1>
          <p className={`text-xl mb-10 ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
            Complete your career profile to get personalized soft skills development and interview coaching
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
              <div className="flex justify-center mb-8">
                <div className="flex space-x-1">
                  {questions.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index < currentStep 
                          ? darkMode ? 'bg-green-400' : 'bg-green-500' 
                          : index === currentStep 
                            ? darkMode ? 'bg-indigo-500' : 'bg-indigo-600' 
                            : darkMode ? 'bg-gray-600 opacity-50' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Question Card */}
              <div 
                className={`rounded-lg p-8 border max-w-2xl mx-auto ${darkMode ? 'bg-gray-900 bg-opacity-30 text-white border-purple-800 border-opacity-20' : 'bg-white text-gray-900 border-indigo-100 shadow-md'}`}
              >
                <h2 className={`text-2xl font-bold mb-6 text-left ${darkMode ? 'text-white' : 'text-gray-900'}`}>{questions[currentStep].question}</h2>
                <p className={`text-sm text-left mb-2 ${darkMode ? 'text-gray-400' : 'text-indigo-700'}`}>Question {currentStep + 1} of {questions.length}</p>
                
                <div className={`rounded-lg overflow-hidden ${darkMode ? 'gradient-border-dark' : 'gradient-border-light'}`}>
                  <textarea
                    className={`w-full p-4 rounded-lg ${darkMode ? 'input-gradient-dark text-white placeholder-gray-400' : 'input-gradient-light text-gray-800 placeholder-gray-500'} border-0 focus:outline-none min-h-[120px] resize-none`}
                    placeholder={questions[currentStep].placeholder}
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                
                <div className="flex justify-between mt-6">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Press Enter to submit your answer and continue</p>
                    <button 
                      onClick={handleSkip}
                      className={`text-sm ${darkMode ? 'text-gray-400 hover:text-white' : 'text-indigo-400 hover:text-indigo-500'} mt-2 block`}
                    >
                      Skip this question
                    </button>
                  </div>
                  
                  <button
                    onClick={handleNext}
                    className={`${darkMode ? 'button-gradient-dark' : 'button-gradient-light'} hover:opacity-90 text-white px-6 py-3 rounded-md flex items-center`}
                    disabled={textInput.trim() === ''}
                  >
                    Next
                    <ArrowRight size={20} className="ml-2" />
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
                <ChatInterface 
                  analysis={aiAnalysis.raw_text} 
                  messages={chatMessages}
                  isTyping={isChatLoading}
                  onBack={() => setShowChat(false)}
                  onSendMessage={async (message, context) => {
                    // Add user message
                    setChatMessages(prev => [...prev, { role: 'user', content: message }]);
                    setIsChatLoading(true);
                    
                    try {
                      // Send message to API
                      const response = await sendChatMessage(message, chatMessages, context);
                      
                      // Add AI response
                      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
                    } catch (error) {
                      console.error('Error sending message:', error);
                      setChatMessages(prev => [...prev, { 
                        role: 'assistant', 
                        content: 'Sorry, I encountered an error processing your request. Please try again.' 
                      }]);
                    } finally {
                      setIsChatLoading(false);
                    }
                  }}
                />
              ) : (
                // Analysis Display
                <AnalysisDisplay analysis={aiAnalysis.raw_text} />
              )}
            </>
          )}
        </div>
      </main>

      {/* Social Proof */}
      <div className="mt-20 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <h2 className={`text-3xl font-bold text-center mb-12 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Trusted by professionals from leading companies</h2>
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
      <footer className={`mt-20 px-6 py-6 border-t ${themeStyles.divider}`}>
        <div className="text-center">
          <p className={themeStyles.mutedText}>&copy; 2025 Reputy.io. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default ReputyTalentAgent;
