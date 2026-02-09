import React, { useState, useEffect, useRef } from 'react';
import { Send, Command, Zap, Database, BarChart3, LayoutGrid } from 'lucide-react';
import { Message, Sender, LogLevel, SystemLog, ExcelGenerationRequest } from './types';
import { sendMessageToOrchestrator } from './services/geminiService';
import { generateExcelFile } from './services/excelService';
import { SystemLogs } from './components/SystemLogs';
import { ChatMessage } from './components/ChatMessage';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Gemini History context
  const historyRef = useRef<any[]>([]);

  const addLog = (level: LogLevel, message: string, module: string = 'CORE') => {
    setLogs(prev => [...prev, {
      id: uuidv4(),
      timestamp: new Date(),
      level,
      message,
      module
    }]);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial welcome message
  useEffect(() => {
    addLog(LogLevel.INFO, 'Wumar Integrator System Initialized', 'BOOT');
    addLog(LogLevel.INFO, 'API Gateways Connected', 'NETWORK');
    addLog(LogLevel.INFO, 'Excel Processor Ready', 'MODULE:XLSX');
    
    setMessages([{
      id: 'init',
      sender: Sender.AGENT,
      content: "Welcome to **Wumar Integrator**. \n\nI am your unified API orchestrator. I can process complex queries, perform real-time data analysis, and **generate advanced Excel reports** instantly.\n\nTry a command like:\n> *\"Create a quarterly sales report for 2024 with regional breakdowns and a summary sheet.\"*",
      timestamp: new Date()
    }]);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userMsg: Message = {
      id: uuidv4(),
      sender: Sender.USER,
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);

    // Update Logs
    addLog(LogLevel.INFO, `Input received: "${userMsg.content.substring(0, 30)}..."`, 'INPUT_HANDLER');
    addLog(LogLevel.ROUTING, 'Analyzing request intent...', 'ORCHESTRATOR');

    // Add temporary thinking message
    const thinkingId = uuidv4();
    setMessages(prev => [...prev, {
      id: thinkingId,
      sender: Sender.AGENT,
      content: '',
      timestamp: new Date(),
      isThinking: true
    }]);

    try {
      // Prepare history for Gemini
      const historyPayload = historyRef.current.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }));
      
      // Update local history ref
      historyRef.current.push({ role: 'user', content: userMsg.content });

      let toolExecuted = false;
      let executedToolData: any = null;

      const responseText = await sendMessageToOrchestrator(
        historyPayload,
        userMsg.content,
        (request: ExcelGenerationRequest) => {
          // TOOL EXECUTION CALLBACK
          toolExecuted = true;
          executedToolData = request;
          addLog(LogLevel.ROUTING, 'Routing to Excel Generation API', 'ROUTER');
          addLog(LogLevel.EXECUTION, `Generating: ${request.filename}.xlsx`, 'EXCEL_ENGINE');
          addLog(LogLevel.EXECUTION, `Processing ${request.sheets.length} datasets...`, 'EXCEL_ENGINE');
          
          const success = generateExcelFile(request.filename, request.sheets);
          
          if (success) {
            addLog(LogLevel.SUCCESS, 'File generated and download triggered.', 'IO_CONTROLLER');
          } else {
            addLog(LogLevel.ERROR, 'File generation failed.', 'IO_CONTROLLER');
          }
        }
      );

      // Update history ref with response
      historyRef.current.push({ role: 'model', content: responseText });

      // Remove thinking, add response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== thinkingId);
        return [...filtered, {
          id: uuidv4(),
          sender: Sender.AGENT,
          content: responseText,
          timestamp: new Date(),
          toolCall: toolExecuted ? {
            name: 'generate_excel',
            args: executedToolData,
            status: 'success'
          } : undefined
        }];
      });

    } catch (error) {
      addLog(LogLevel.ERROR, 'Orchestration failure', 'SYSTEM_CORE');
      setMessages(prev => prev.filter(m => m.id !== thinkingId)); // clear thinking
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-nexus-900 text-gray-100 overflow-hidden font-sans">
      
      {/* Sidebar / Logs */}
      <SystemLogs logs={logs} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        
        {/* Header */}
        <header className="bg-nexus-900/90 backdrop-blur-md border-b border-nexus-700 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-nexus-accent/10 p-2 rounded-lg border border-nexus-accent/20">
              <LayoutGrid className="w-5 h-5 text-nexus-accent" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Wumar Integrator</h1>
              <p className="text-xs text-gray-500 font-mono">MULTI-API ORCHESTRATION LAYER // V.2.0.4</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-gray-500">
             <div className="flex items-center gap-1.5">
               <Database className="w-3 h-3" />
               <span>DATA: ACTIVE</span>
             </div>
             <div className="flex items-center gap-1.5">
               <Zap className="w-3 h-3 text-yellow-500" />
               <span>LATENCY: 42ms</span>
             </div>
             <div className="flex items-center gap-1.5">
               <div className="w-2 h-2 rounded-full bg-green-500"></div>
               <span>ONLINE</span>
             </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-b from-nexus-900 to-nexus-800 scroll-smooth">
          <div className="max-w-4xl mx-auto pb-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-nexus-900 border-t border-nexus-700">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-nexus-accent to-purple-600 rounded-xl opacity-30 group-hover:opacity-60 transition duration-300 blur"></div>
            <div className="relative flex items-center bg-nexus-800 rounded-xl border border-nexus-700 overflow-hidden shadow-2xl">
              <div className="pl-4 text-gray-500">
                <Command className="w-5 h-5" />
              </div>
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter command (e.g., 'Generate an inventory report for 50 items with prices and categories')..."
                className="w-full bg-transparent text-gray-100 p-4 focus:outline-none placeholder-gray-500 font-medium"
                disabled={isProcessing}
                autoFocus
              />
              <button 
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className={`p-3 m-1 rounded-lg transition-all duration-200 ${
                  input.trim() && !isProcessing
                    ? 'bg-nexus-accent hover:bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                    : 'bg-nexus-700 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isProcessing ? <LoaderIcon /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div className="max-w-4xl mx-auto mt-3 flex justify-center gap-6 text-[10px] text-gray-500 font-mono uppercase tracking-widest">
            <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> Excel Engine</span>
            <span className="flex items-center gap-1"><Command className="w-3 h-3" /> Auto-Routing</span>
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> Real-time Execution</span>
          </div>
        </div>

      </div>
    </div>
  );
}

const LoaderIcon = () => (
  <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default App;