import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Send, Paperclip, X, Bot, User, Loader2, 
  Plus, MessageSquare, Menu, Trash2, FileText, Image as ImageIcon
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const App = () => {
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('kal_sessions');
    return saved ? JSON.parse(saved) : [{ id: '1', title: 'New Chat', messages: [{ role: 'bot', content: 'ආයුබෝවන්! මම KAL AI. මට ගොනු (Files) පරීක්ෂා කිරීමට හෝ ඕනෑම දෙයකට උදව් කළ හැකියි.' }] }];
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
  }, [sessions]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, {
          file,
          preview: file.type.startsWith('image/') ? reader.result : null,
          name: file.name,
          type: file.type
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
      files: attachments.map(a => ({ name: a.name, type: a.type, preview: a.preview }))
    };
    
    const updatedMessages = [...currentSession.messages, userMsg];
    setSessions(sessions.map(s => s.id === currentSessionId ? { ...s, messages: updatedMessages, title: input.slice(0, 20) || 'File Analysis' } : s));
    
    const currentAttachments = [...attachments];
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      let promptParts = [input || "මෙම ගොනුව විස්තර කරන්න."];
      
      for (const att of currentAttachments) {
        if (att.preview) {
          const base64Data = att.preview.split(',')[1];
          promptParts.push({ inlineData: { data: base64Data, mimeType: att.type } });
        }
      }

      const result = await model.generateContent(promptParts);
      const response = await result.response;
      const botMsg = { role: 'bot', content: response.text() };
      
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...updatedMessages, botMsg] } : s));
    } catch (error) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, messages: [...updatedMessages, { role: 'bot', content: 'සමාවෙන්න, API දෝෂයක්. පසුව උත්සාහ කරන්න.' }] } : s));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {isSidebarOpen && (
        <div className="w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-850">
          <button onClick={() => {
            const newS = { id: Date.now().toString(), title: 'New Chat', messages: [{ role: 'bot', content: 'ආයුබෝවන්!' }] };
            setSessions([newS, ...sessions]);
            setCurrentSessionId(newS.id);
          }} className="m-4 flex items-center gap-2 p-3 border border-indigo-200 rounded-xl hover:bg-indigo-50 text-indigo-600 font-medium transition-all">
            <Plus size={18} /> New Chat
          </button>
          <div className="flex-1 overflow-y-auto px-2">
            {sessions.map(s => (
              <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer mb-1 ${currentSessionId === s.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700' : 'hover:bg-slate-100'}`}>
                <MessageSquare size={18} />
                <span className="flex-1 truncate text-sm">{s.title}</span>
                <Trash2 size={14} className="opacity-0 group-hover:opacity-100 text-red-500" onClick={(e) => { e.stopPropagation(); setSessions(sessions.filter(x => x.id !== s.id)); }} />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        <header className="p-4 border-b flex items-center gap-4">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-lg"><Menu size={20} /></button>
          <h1 className="font-bold">KAL AI Assistant</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="max-w-3xl mx-auto">
            {currentSession.messages.map((msg, i) => (
              <div key={i} className={`flex gap-4 mb-6 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-100' : 'bg-indigo-600 text-white'}`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`p-4 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100'}`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {msg.files && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.files.map((f, fi) => (
                        <div key={fi} className="text-[10px] bg-black/10 p-1 rounded">📎 {f.name}</div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        <div className="p-4 border-t bg-white dark:bg-slate-900">
          <div className="max-w-3xl mx-auto">
            {attachments.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto p-2">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group">
                    <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center border overflow-hidden">
                      {att.preview ? <img src={att.preview} className="w-full h-full object-cover" /> : <FileText size={20} />}
                    </div>
                    <button onClick={() => removeAttachment(i)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"><X size={12} /></button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl border">
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:bg-slate-200 rounded-full"><Paperclip size={20} /></button>
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Message or upload files..." 
                className="flex-1 bg-transparent border-none focus:ring-0 py-2 resize-none" 
                rows={1}
              />
              <button onClick={handleSend} disabled={isLoading} className="bg-indigo-600 text-white p-3 rounded-xl">
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