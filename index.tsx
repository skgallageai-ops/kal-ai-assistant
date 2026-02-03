import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Send, Paperclip, X, Bot, User, Loader2, 
  Plus, MessageSquare, Menu, Trash2, FileText, Sun, Moon
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const App = () => {
  // --- Dark Mode State ---
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('kal_theme');
    return saved === 'dark';
  });

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('kal_sessions');
    return saved ? JSON.parse(saved) : [{ id: '1', title: 'New Chat', messages: [{ role: 'bot', content: 'ආයුබෝවන්! මම KAL AI. මට ඔබට අද උදව් කළ හැක්කේ කෙසේද?' }] }];
  });
  const [currentSessionId, setCurrentSessionId] = useState(sessions[0].id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [attachments, setAttachments] = useState([]);

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('kal_sessions', JSON.stringify(sessions));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sessions]);

  // Dark Mode Apply කිරීමට පාවිච්චි කරන useEffect එක
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('kal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('kal_theme', 'light');
    }
  }, [isDarkMode]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const createNewChat = () => {
    const newSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [{ role: 'bot', content: 'ආයුබෝවන්! අලුත් චැට් එකක් පටන් ගමු.' }]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const deleteChat = (id, e) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    if (newSessions.length === 0) {
      createNewChat();
    } else {
      setSessions(newSessions);
      if (currentSessionId === id) setCurrentSessionId(newSessions[0].id);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          file,
          preview: file.type.startsWith('image/') ? reader.result : null,
          name: file.name,
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMsg = { 
      role: 'user', 
      content: input,
      files: attachments.map(a => ({ name: a.name, type: a.mimeType }))
    };
    
    const updatedMessages = [...currentSession.messages, userMsg];
    setSessions(sessions.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages, title: input.slice(0, 20) || 'New Chat' } : s));
    
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); 
      let promptParts = [input || "Analyze this"];
      
      for (const att of currentAttachments) {
        if (att.preview) {
          const base64Data = att.preview.split(',')[1];
          promptParts.push({ inlineData: { data: base64Data, mimeType: att.mimeType } });
        }
      }

      const result = await model.generateContent(promptParts);
      const response = await result.response;
      const botMsg = { role: 'bot', content: response.text() };
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...updatedMessages, botMsg] } : s));
    } catch (error) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...updatedMessages, { role: 'bot', content: 'API Error. Please try again.' }] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {/* Sidebar */}
      {isSidebarOpen && (
        <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900">
          <button onClick={createNewChat} className="m-4 flex items-center gap-2 p-3 border border-indigo-200 dark:border-indigo-900 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all font-medium text-indigo-600 dark:text-indigo-400">
            <Plus size={18} /> New Chat
          </button>
          <div className="flex-1 overflow-y-auto px-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${currentSessionId === s.id ? 'bg-indigo-50 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                <MessageSquare size={18} />
                <span className="flex-1 truncate text-sm">{s.title}</span>
                <Trash2 size={14} onClick={(e) => deleteChat(s.id, e)} className="opacity-0 group-hover:opacity-100 hover:text-red-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <header className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><Menu size={20} /></button>
            <h1 className="font-bold">KAL AI Assistant</h1>
          </div>
          
          {/* Dark Mode Toggle Button */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
          >
            {isDarkMode ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
            <span className="text-xs font-medium uppercase tracking-wider">{isDarkMode ? 'Light' : 'Dark'}</span>
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="max-w-3xl mx-auto">
            {currentSession.messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-indigo-600 text-white'}`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`p-4 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'}`}>
                  <p className="text-[15px] whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="max-w-3xl mx-auto">
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative w-14 h-14 bg-slate-100 dark:bg-slate-800 rounded-lg border dark:border-slate-700 flex items-center justify-center">
                    {att.preview ? <img src={att.preview} className="w-full h-full object-cover rounded-lg" /> : <FileText size={20} />}
                    <button onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border dark:border-slate-700">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"><Paperclip size={20} /></button>
              <input 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
                placeholder="Type here..." 
                className="flex-1 bg-transparent border-none focus:ring-0 px-3 dark:text-white" 
              />
              <button onClick={handleSend} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-xl transition-colors">
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);