'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, User as UserIcon, Bot, Plus, X, Loader2 } from 'lucide-react';
import { AXIOS_INSTANCE as axiosInstance } from '@/api/axios-instance';
import { useAuth } from '@/context/auth-context';

interface Message {
    role: 'system' | 'user';
    content: string;
}

interface ProjectData {
    name: string;
    description: string;
    sector: string;
    requiredSkills: string[];
}

export default function FounderOnboardingPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>([
        { role: 'system', content: "Hello! I'm here to help you kickstart your project. Let's start with the basics: What is the name of your startup or project?" }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [step, setStep] = useState(0);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Collected Data
    const [projectData, setProjectData] = useState<ProjectData>({
        name: '',
        description: '',
        sector: '',
        requiredSkills: []
    });

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setInputValue('');
        setIsTyping(true);

        // Simulate AI processing & Data Extraction
        setTimeout(async () => {
            let nextSystemMessage = '';
            let nextStep = step + 1;

            // Simple state machine for onboarding flow
            switch (step) {
                case 0: // Name
                    setProjectData(prev => ({ ...prev, name: userMessage }));
                    nextSystemMessage = "Great name! Now, tell me a bit about what you're building. What problem are you solving?";
                    break;
                case 1: // Description
                    setProjectData(prev => ({ ...prev, description: userMessage }));
                    nextSystemMessage = "Sounds interesting. Which sector or industry does this fall into? (e.g., Fintech, HealthTech, E-commerce)";
                    break;
                case 2: // Sector
                    setProjectData(prev => ({ ...prev, sector: userMessage }));
                    nextSystemMessage = "Got it. Finally, what key skills are you looking for in a co-founder? (e.g., React, Marketing, Finance)";
                    break;
                case 3: // Skills
                    const skills = userMessage.split(',').map(s => s.trim());
                    setProjectData(prev => ({ ...prev, requiredSkills: skills }));
                    nextSystemMessage = "Perfect! I've gathered all the details. I'm creating your project dashboard now...";

                    await submitProject({ ...projectData, requiredSkills: skills }); // Submit with latest data
                    break;
                default:
                    nextSystemMessage = "All set!";
            }

            setMessages(prev => [...prev, { role: 'system', content: nextSystemMessage }]);
            setStep(nextStep);
            setIsTyping(false);
        }, 1000);
    };

    const submitProject = async (data: ProjectData) => {
        try {
            await axiosInstance.post('/projects', {
                name: data.name,
                pitch: data.description.substring(0, 100), // Naive pitch extraction
                description: data.description,
                sector: data.sector,
                requiredSkills: data.requiredSkills,
                stage: 'IDEA' // Default
            });

            // Redirect to dashboard (or home for now)
            setTimeout(() => {
                router.push('/');
            }, 1500);
        } catch (error) {
            console.error("Failed to create project", error);
            setMessages(prev => [...prev, { role: 'system', content: "Oops, something went wrong while saving your project. Please try again." }]);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                        <Bot size={24} />
                    </div>
                    <div>
                        <h1 className="font-bold text-gray-900">Co-Founder Advisor</h1>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                    <X size={24} />
                </button>
            </header>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`
                    max-w-[80%] sm:max-w-[70%] rounded-2xl px-5 py-3 shadow-sm text-base leading-relaxed
                    ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-br-none'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                            }
                `}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isTyping && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white border-t p-4 sm:p-6">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Type your answer..."
                        className="flex-1 bg-gray-50 border-gray-200 rounded-xl px-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        disabled={isTyping}
                        autoFocus
                    />
                    <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isTyping}
                        className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
                <p className="text-center text-xs text-gray-400 mt-3">
                    AI can make mistakes. Please review your project details later.
                </p>
            </div>
        </div>
    );
}
