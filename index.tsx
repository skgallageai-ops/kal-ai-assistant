
import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Send, 
  Plus, 
  User, 
  Bot, 
  Settings, 
  Menu,
  Sparkles,
  RefreshCw,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  FileSpreadsheet,
  Zap,
  ChevronRight,
  ShieldCheck,
  Bell,
  Smartphone,
  LogOut,
  Info,
  Moon,
  Sun,
  Lock,
  ExternalLink
} from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

interface Attachment {
  name: string;
  type: string;
  data: string; // base64
  preview?: string;
}

interface Message {
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
}

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-slate-100 dark:border-slate-700">
        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'ආයුබෝවන්! මම KAL AI Assistant. මට රූප, PDF සහ Excel ගොනු කියවන්න පුළුවන්. ඔබට උදව් කරන්නේ කොහොමද?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Modal states
  const [showAbout, setShowAbout] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const newAttachment: Attachment = {
          name: file.name,
          type: file.type,
          data: base64,
          preview: file.type.startsWith('image/') ? (reader.result as string) : undefined
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (overrideText?: string) => {
    const messageText = overrideText || input;
    if ((!messageText.trim() && attachments.length === 0) || isLoading) return;

    const userMessage: Message = { 
      role: 'user', 
      text: messageText,
      attachments: attachments.length > 0 ? [...attachments] : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setIsLoading(true);

    try {
      const isImageEditing = attachments.some(a => a.type.startsWith('image/')) && 
                            (messageText.toLowerCase().includes('edit') || messageText.toLowerCase().includes('වෙනස්') || messageText.toLowerCase().includes('change'));
      
      const selectedModel = isImageEditing ? 'gemini-2.5-flash-image' : 'gemini-3-flash-preview';

      const parts: any[] = [{ text: messageText || (attachments.length > 0 ? "Describe this file." : "") }];
      
      attachments.forEach(file => {
        parts.push({
          inlineData: {
            mimeType: file.type,
            data: file.data
          }
        });
      });

      const response = await genAI.models.generateContent({
        model: selectedModel,
        contents: [{ role: 'user', parts }],
      });

      let aiResponse: Message = { role: 'model', text: response.text || '' };
      
      const outputParts = response.candidates?.[0]?.content?.parts || [];
      outputParts.forEach(part => {
        if (part.inlineData) {
          if (!aiResponse.attachments) aiResponse.attachments = [];
          aiResponse.attachments.push({
            name: 'Generated Image',
            type: part.inlineData.mimeType,
            data: part.inlineData.data,
            preview: `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
          });
        }
      });

      if (!aiResponse.text && !aiResponse.attachments) {
        aiResponse.text = "මම එම ගොනු පරීක්ෂා කළා. මට ඔබට උදව් කළ හැකි වෙනත් යමක් තිබේද?";
      }

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "සමාවෙන්න, ගොනුව පරීක්ෂා කිරීමේදී දෝෂයක් සිදු වුණා. කරුණාකර නැවත උත්සාහ කරන්න." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      alert("Notifications enabled! You will now receive updates when the AI responds (if the tab is backgrounded).");
    }
  };

  const quickAction = (action: string) => {
    let prompt = "";
    switch(action) {
      case 'Image Vision': prompt = "මෙම රූපය විස්තර කරන්න."; break;
      case 'PDF Analysis': prompt = "මෙම PDF එකේ සාරාංශයක් ලබා දෙන්න."; break;
      case 'Excel Insights': prompt = "මෙම දත්ත විග්‍රහ කර වැදගත් කරුණු පෙන්වන්න."; break;
      case 'Photo Editing': prompt = "මෙම රූපය මෙලෙස වෙනස් කරන්න: "; break;
    }
    setInput(prompt);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
    const textarea = document.querySelector('textarea');
    if (textarea) textarea.focus();
  };

  const clearChat = () => {
    setMessages([{ role: 'model', text: 'ආයුබෝවන්! මම KAL AI Assistant. ඔබට උදව් කරන්නේ කොහොමද?' }]);
    setAttachments([]);
    setInput('');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="text-red-500" />;
    if (type.includes('sheet') || type.includes('csv')) return <FileSpreadsheet className="text-green-600" />;
    return <FileText className="text-blue-500" />;
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans transition-colors duration-300 ${isDarkMode ? 'dark bg-slate-900 text-slate-100' : 'bg-[#fcfcfd] text-slate-900'}`}>
      
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm transition-all duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed md:relative z-50 h-full ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0'} bg-[#0f172a] transition-all duration-300 ease-out flex flex-col overflow-hidden text-white shadow-2xl`}>
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg shadow-indigo-600/20">
              <Sparkles size={20} className="text-white fill-current" />
            </div>
            <span>KAL AI</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          <button onClick={clearChat} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 transition-all w-full p-3.5 rounded-2xl shadow-lg shadow-indigo-900/20 font-semibold active:scale-95">
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 px-2">Workspace Actions</div>
            <div className="space-y-1">
              {[
                { name: 'Image Vision', icon: <ImageIcon size={16} /> },
                { name: 'PDF Analysis', icon: <FileText size={16} /> },
                { name: 'Excel Insights', icon: <FileSpreadsheet size={16} /> },
                { name: 'Photo Editing', icon: <Zap size={16} /> }
              ].map((action) => (
                <button 
                  key={action.name} 
                  onClick={() => quickAction(action.name)}
                  className="flex items-center gap-3 w-full p-3 text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-xl transition-all group active:scale-[0.98]"
                >
                  <span className="text-slate-600 group-hover:text-indigo-400 transition-colors">{action.icon}</span>
                  {action.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-800">
          <div className="flex items-center gap-3 w-full group cursor-pointer bg-slate-800/30 p-2.5 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white font-bold shadow-md ring-2 ring-slate-800">SK</div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-semibold text-slate-200 truncate">S.Kalum</span>
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Premium User</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel (Drawer) */}
      <div className={`fixed inset-y-0 right-0 z-[60] w-full md:w-[400px] bg-white dark:bg-slate-800 shadow-2xl transition-transform duration-300 ease-in-out transform ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} border-l border-slate-100 dark:border-slate-700`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <h2 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-3">
              <Settings size={22} className="text-indigo-600" />
              Settings
            </h2>
            <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
              <X size={24} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-20">
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Account Preferences</h3>
              <div className="space-y-2">
                <button onClick={toggleNotifications} className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                    <span className="text-indigo-500"><Bell size={18} /></span>
                    Notifications
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
                
                <button onClick={() => setShowPrivacy(true)} className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                    <span className="text-emerald-500"><ShieldCheck size={18} /></span>
                    Privacy & Security
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>

                <button onClick={() => setIsDarkMode(!isDarkMode)} className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                    <span className="text-amber-500">{isDarkMode ? <Sun size={18} /> : <Moon size={18} />}</span>
                    App Appearance
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{isDarkMode ? 'Dark' : 'Light'}</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </button>

                <button onClick={() => setShowAbout(true)} className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-semibold text-sm">
                    <span className="text-blue-500"><Info size={18} /></span>
                    About KAL AI
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 absolute bottom-0 w-full">
            <button className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-50 dark:bg-slate-700 text-red-500 font-bold text-xs rounded-2xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-95">
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Info Modals */}
      <Modal isOpen={showAbout} onClose={() => setShowAbout(false)} title="About KAL AI">
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
             <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles size={24} />
             </div>
             <div>
                <p className="font-bold text-slate-800 dark:text-white">KAL AI Assistant</p>
                <p className="text-xs text-slate-500">Version 2.4.0 (Enterprise)</p>
             </div>
          </div>
          <p>KAL AI is a multi-modal intelligent hub designed for seamless interaction with Gemini's most advanced models. It allows you to analyze documents, edit photos, and gain insights from complex data through a conversational interface.</p>
          <div className="pt-2">
            <p className="font-bold text-xs uppercase text-slate-400 mb-2">Developed By</p>
            <p className="font-semibold text-slate-800 dark:text-white">S. Kalum</p>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} title="Privacy & Security">
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="p-2 h-fit bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
              <Lock size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white mb-1">Your Data is Private</p>
              <p className="text-xs text-slate-500 leading-relaxed">KAL AI works using the Google Gemini API. Conversations are processed in real-time. No chat history is stored on our servers after your session ends.</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="p-2 h-fit bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white mb-1">Secure Connections</p>
              <p className="text-xs text-slate-500 leading-relaxed">All data transfers between your browser and the Gemini API are encrypted using standard SSL protocols.</p>
            </div>
          </div>
          <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all">
            Detailed Privacy Policy <ExternalLink size={12} />
          </button>
        </div>
      </Modal>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-slate-900 relative">
        <header className="h-16 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3 md:gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400 transition-colors active:scale-90">
              <Menu size={22} />
            </button>
            <div className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex flex-col">
              <span className="text-[15px] font-bold text-slate-800 dark:text-white leading-none tracking-tight">KAL AI Assistant</span>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.1em] mt-1 uppercase hidden sm:block">Intelligent Multi-Modal Hub</span>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
             <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-full border border-green-100 dark:border-green-800">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[9px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wide">Secure</span>
             </div>
             <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-indigo-600 transition-all">
               <Settings size={22} />
             </button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-10 bg-gradient-to-b from-transparent to-slate-50/50 dark:to-slate-800/20">
          <div className="max-w-4xl mx-auto space-y-10">
            {messages.map((msg, index) => (
              <div key={index} className={`flex gap-3 md:gap-5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-3 duration-500`}>
                {msg.role === 'model' && (
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex-shrink-0 flex items-center justify-center text-white shadow-xl shadow-indigo-200 mt-1 ring-4 ring-indigo-50 dark:ring-indigo-900/20">
                    <Bot size={22} />
                  </div>
                )}
                <div className={`flex flex-col gap-3 max-w-[90%] md:max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={`flex flex-wrap gap-3 mb-1 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-xl max-w-[280px] bg-white dark:bg-slate-800 p-1 group relative">
                          {att.preview ? (
                            <img src={att.preview} alt="attached" className="w-full h-auto max-h-64 object-cover rounded-xl transition-transform group-hover:scale-105" />
                          ) : (
                            <div className="bg-slate-50 dark:bg-slate-700/50 p-4 flex items-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">{getFileIcon(att.type)}</div>
                              <span className="truncate w-40">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.text && (
                    <div className={`p-5 rounded-3xl text-[15px] leading-relaxed shadow-sm message-bubble ${
                      msg.role === 'user' 
                        ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-100 dark:shadow-none' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-slate-100/50 dark:shadow-none'
                    }`}>
                      {msg.text}
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 flex items-center justify-center text-slate-500 shadow-sm mt-1">
                    <User size={22} />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4 md:gap-5 justify-start">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex-shrink-0 flex items-center justify-center text-indigo-400 border border-indigo-100 dark:border-indigo-800">
                  <RefreshCw className="animate-spin" size={20} />
                </div>
                <div className="bg-white dark:bg-slate-800 h-12 w-36 rounded-3xl rounded-tl-none border border-slate-100 dark:border-slate-700 shadow-sm flex items-center justify-center px-6 space-x-2">
                  <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                  <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                  <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-10 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 safe-area-bottom">
          <div className="max-w-4xl mx-auto">
            {/* Attachment Preview Area */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-4 mb-5">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group animate-in zoom-in duration-300">
                    <div className="w-20 h-20 rounded-2xl border-2 border-slate-100 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800 flex items-center justify-center shadow-md">
                      {att.preview ? (
                        <img src={att.preview} className="w-full h-full object-cover" />
                      ) : (
                        getFileIcon(att.type)
                      )}
                    </div>
                    <button 
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-2 shadow-xl hover:bg-red-500 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-[2.2rem] p-2.5 pl-5 pr-3.5 transition-all focus-within:ring-4 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-500/5 focus-within:border-indigo-400 focus-within:bg-white dark:focus-within:bg-slate-800 group shadow-sm">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                multiple 
                accept="image/*,.pdf,.csv,.xlsx,.xls"
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full transition-all active:scale-90"
                title="Attach Files"
              >
                <Paperclip size={24} />
              </button>
              
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message KAL Assistant..."
                className="flex-1 bg-transparent border-none py-4 px-2 text-[16px] focus:ring-0 resize-none max-h-40 placeholder:text-slate-400 font-medium text-slate-800 dark:text-slate-100"
              />
              
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || (!input.trim() && attachments.length === 0)}
                className={`p-4 rounded-full transition-all ${
                  (input.trim() || attachments.length > 0) && !isLoading 
                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 scale-105 active:scale-90' 
                    : 'text-slate-300'
                }`}
              >
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
