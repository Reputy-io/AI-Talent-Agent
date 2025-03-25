import React, { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { submitQuestionnaire } from './services/apiService';

const ReputyTalentAgent = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [textInput, setTextInput] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Predefined questions including CV/job application related questions
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

  const handleNext = () => {
    if (textInput.trim() === '') return;

    // Save the current answer
    setAnswers({
      ...answers,
      [questions[currentStep].id]: textInput
    });

    // Clear input for next question
    setTextInput('');

    // Move to next question or finish
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Process completed questionnaire
      console.log("All answers collected:", answers);

      // Add the final answer to the answers object
      const finalAnswers = {
        ...answers,
        [questions[currentStep].id]: textInput
      };

      // Submit the questionnaire to the backend
      submitQuestionnaireToBackend(finalAnswers);
    }
  };

  const submitQuestionnaireToBackend = async (questionnaireData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await submitQuestionnaire(questionnaireData);
      console.log("Backend response:", response);

      // Set the AI analysis from the response
      setAiAnalysis(response.ai_analysis);
      setIsSubmitted(true);
    } catch (err) {
      console.error("Error submitting questionnaire:", err);
      setError("Failed to submit questionnaire. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNext();
    }
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  // Theme-based styles
  const themeStyles = {
    background: darkMode 
      ? 'bg-gradient-to-br from-gray-900 via-black to-gray-900' 
      : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50',
    text: darkMode ? 'text-white' : 'text-gray-800',
    subtext: darkMode ? 'text-gray-300' : 'text-gray-600',
    mutedText: darkMode ? 'text-gray-400' : 'text-gray-500',
    card: darkMode ? 'bg-gray-800 bg-opacity-50' : 'bg-white bg-opacity-80',
    cardBorder: darkMode ? 'border-gray-700' : 'border-gray-200',
    input: darkMode 
      ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500' 
      : 'bg-white border-gray-300 text-gray-800 placeholder-gray-400',
    buttonPrimary: darkMode 
      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
      : 'bg-indigo-600 hover:bg-indigo-700 text-white',
    buttonSecondary: darkMode 
      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
      : 'bg-gray-200 hover:bg-gray-300 text-gray-800',
    link: darkMode ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700',
    divider: darkMode ? 'border-gray-700' : 'border-gray-300',
    progressActive: darkMode ? 'bg-indigo-500' : 'bg-indigo-600',
    progressComplete: darkMode ? 'bg-green-500' : 'bg-green-600',
    progressInactive: darkMode ? 'bg-gray-600' : 'bg-gray-300'
  };

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
          <span className={themeStyles.text}>Career Assessment</span>
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
              <div className={`${themeStyles.card} rounded-lg p-6 mb-6 text-left border ${themeStyles.cardBorder} backdrop-blur-sm`}>
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
                    {currentStep < questions.length - 1 ? 'Next' : 'Submit'}
                  </button>
                </div>
              </div>

              <p className={`${themeStyles.mutedText} mt-4 text-sm`}>
                Press Enter to submit your answer and continue
              </p>

              {/* Skip option for optional questions */}
              <button 
                className={`${themeStyles.mutedText} hover:${themeStyles.link} mt-4 text-sm underline`}
                onClick={() => {
                  setTextInput('');
                  if (currentStep < questions.length - 1) {
                    setCurrentStep(currentStep + 1);
                  }
                }}
              >
                Skip this question
              </button>
            </>
          ) : (
            <>
              {/* AI Analysis Results Display */}
              <div className={`${themeStyles.card} rounded-lg p-8 mb-6 text-left border ${themeStyles.cardBorder} backdrop-blur-sm`}>
                <h2 className="text-3xl font-bold mb-6 text-center">Your Career Analysis</h2>
                
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-lg">Generating your personalized career analysis...</p>
                  </div>
                ) : error ? (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                  </div>
                ) : aiAnalysis ? (
                  <div className="space-y-8">
                    {/* Career Profile Summary */}
                    <div>
                      <h3 className="text-2xl font-semibold mb-3 text-indigo-500">Career Profile Summary</h3>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                        <p className="whitespace-pre-line">{aiAnalysis.career_profile_summary}</p>
                      </div>
                    </div>
                    
                    {/* CV Recommendations */}
                    <div>
                      <h3 className="text-2xl font-semibold mb-3 text-indigo-500">CV Improvement Recommendations</h3>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                        <p className="whitespace-pre-line">{aiAnalysis.cv_recommendations}</p>
                      </div>
                    </div>
                    
                    {/* Interview Tips */}
                    <div>
                      <h3 className="text-2xl font-semibold mb-3 text-indigo-500">Interview Preparation Tips</h3>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                        <p className="whitespace-pre-line">{aiAnalysis.interview_tips}</p>
                      </div>
                    </div>
                    
                    {/* Skill Development Plan */}
                    <div>
                      <h3 className="text-2xl font-semibold mb-3 text-indigo-500">Skill Development Plan</h3>
                      <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} border ${themeStyles.cardBorder}`}>
                        <p className="whitespace-pre-line">{aiAnalysis.skill_development_plan}</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4 mt-6">
                      <button 
                        className={`${themeStyles.buttonPrimary} px-6 py-3 rounded-md`}
                        onClick={() => {
                          // Download functionality could be added here
                          alert("Download functionality will be implemented soon!");
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
            </>
          )}
        </div>
      </main>
      
      {/* Social Proof */}
      <div className="mt-20 px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className={`w-full border-t ${themeStyles.divider}`}></div>
            </div>
            <div className="relative flex justify-center">
              <span className={`${darkMode ? 'bg-black' : 'bg-white'} px-4 ${themeStyles.mutedText}`}>
                More than <span className="text-blue-500 font-bold">2M</span> professionals improved their careers with Reputy.io
              </span>
            </div>
          </div>

          {/* Partner Logos */}
          <div className="mt-12 flex justify-center space-x-12 opacity-70">
            {[1, 2, 3, 4, 5].map((index) => (
              <div key={index} className="w-12 h-12 flex items-center justify-center">
                <div className={`w-8 h-8 rounded-full ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReputyTalentAgent;
