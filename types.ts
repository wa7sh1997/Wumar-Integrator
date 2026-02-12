export enum Sender {
  USER = 'USER',
  SYSTEM = 'SYSTEM',
  AGENT = 'AGENT'
}

export enum LogLevel {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  ROUTING = 'ROUTING',
  EXECUTION = 'EXECUTION'
}

export interface SystemLog {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  module: string;
}

export interface Message {
  id: string;
  sender: Sender;
  content: string;
  timestamp: Date;
  isThinking?: boolean;
  toolCall?: {
    name: string;
    args: any;
    status: 'pending' | 'success' | 'error';
    result?: string;
  };
}

export interface SheetData {
  name: string;
  data: (string | number | boolean | null)[][];
}

export interface ExcelGenerationRequest {
  filename: string;
  sheets: SheetData[];
}

export interface BackendExecutionResponse {
  message: string;
  generatedFile?: {
    id: string;
    filename: string;
    sheetNames: string[];
    downloadUrl: string;
  };
}
