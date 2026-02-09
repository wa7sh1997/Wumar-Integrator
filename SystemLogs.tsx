import React, { useEffect, useRef } from 'react';
import { LogLevel, SystemLog } from '../types';
import { Terminal, Activity, Cpu, Server, CheckCircle, AlertTriangle } from 'lucide-react';

interface SystemLogsProps {
  logs: SystemLog[];
}

export const SystemLogs: React.FC<SystemLogsProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getIcon = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ROUTING: return <Server className="w-3 h-3 text-nexus-accent" />;
      case LogLevel.EXECUTION: return <Cpu className="w-3 h-3 text-purple-400" />;
      case LogLevel.SUCCESS: return <CheckCircle className="w-3 h-3 text-nexus-success" />;
      case LogLevel.WARNING: return <AlertTriangle className="w-3 h-3 text-nexus-warning" />;
      case LogLevel.ERROR: return <AlertTriangle className="w-3 h-3 text-nexus-danger" />;
      default: return <Activity className="w-3 h-3 text-gray-400" />;
    }
  };

  const getColor = (level: LogLevel) => {
    switch (level) {
      case LogLevel.ROUTING: return 'text-nexus-accent';
      case LogLevel.EXECUTION: return 'text-purple-400';
      case LogLevel.SUCCESS: return 'text-nexus-success';
      case LogLevel.WARNING: return 'text-nexus-warning';
      case LogLevel.ERROR: return 'text-nexus-danger';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-nexus-900 border-r border-nexus-700 w-80 font-mono text-xs hidden md:flex">
      <div className="p-4 border-b border-nexus-700 bg-nexus-800 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-nexus-accent" />
        <span className="font-semibold text-gray-200">SYSTEM KERNEL</span>
        <div className="ml-auto flex gap-1">
          <div className="w-2 h-2 rounded-full bg-nexus-success animate-pulse"></div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1" ref={scrollRef}>
        {logs.length === 0 && (
          <div className="text-gray-600 italic p-2">System initialized. Awaiting input stream...</div>
        )}
        {logs.map((log) => (
          <div key={log.id} className="p-2 rounded hover:bg-nexus-800 transition-colors border-l-2 border-transparent hover:border-nexus-700">
            <div className="flex items-center gap-2 mb-1 opacity-70">
              <span className="text-[10px] text-gray-500">{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}</span>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${getColor(log.level)}`}>
                [{log.level}]
              </span>
            </div>
            <div className="flex gap-2">
              <div className="mt-0.5">{getIcon(log.level)}</div>
              <span className="text-gray-300 leading-tight break-all">{log.message}</span>
            </div>
            {log.module && (
               <div className="ml-5 mt-1 text-[10px] text-gray-500 font-mono">
                 Module: {log.module}
               </div>
            )}
          </div>
        ))}
      </div>
      
      <div className="p-2 border-t border-nexus-700 bg-nexus-800 text-[10px] text-gray-500 flex justify-between">
        <span>CPU: 12%</span>
        <span>MEM: 442MB</span>
        <span>UPTIME: 99.9%</span>
      </div>
    </div>
  );
};