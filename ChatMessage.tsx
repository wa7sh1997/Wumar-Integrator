import React from 'react';
import { Message, Sender } from './types';
import { Bot, User, FileSpreadsheet, Loader2, Download } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === Sender.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-4`}>
        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${isUser ? 'bg-indigo-600' : 'bg-nexus-700'}`}>
          {isUser ? <User className="w-6 h-6 text-white" /> : <Bot className="w-6 h-6 text-nexus-accent" />}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 mb-1 text-xs text-gray-400">
            <span>{isUser ? 'OPERATOR' : 'NEXUS AGENT'}</span>
            <span>•</span>
            <span>{message.timestamp.toLocaleTimeString()}</span>
          </div>

          <div className={`p-4 rounded-xl text-sm leading-relaxed shadow-lg ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-nexus-800 text-gray-200 border border-nexus-700 rounded-tl-none'}`}>
            {message.isThinking ? (
              <div className="flex items-center gap-2 text-nexus-accent">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="font-mono animate-pulse">Processing Request...</span>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div>
            )}

            {message.toolCall && (
              <div className="mt-4 p-3 bg-nexus-900 rounded border border-nexus-700/50 flex items-center gap-3">
                <div className="bg-green-900/30 p-2 rounded"><FileSpreadsheet className="w-5 h-5 text-green-400" /></div>
                <div className="flex-1">
                  <div className="text-xs text-gray-500 uppercase font-bold mb-0.5">Automated Task Executed</div>
                  <div className="text-sm font-mono text-green-400">Generated: {message.toolCall.args.filename}</div>
                  <div className="text-xs text-gray-500 mt-1">Sheets: {message.toolCall.args.sheets.map((s: any) => s.name).join(', ')}</div>
                  {message.toolCall.args.downloadUrl && (
                    <a href={message.toolCall.args.downloadUrl} className="inline-flex items-center gap-1 mt-2 text-xs text-nexus-accent hover:underline">
                      <Download className="w-3 h-3" /> Download file
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
