import { GoogleGenAI, Type, FunctionDeclaration, Tool } from "@google/genai";
import { ExcelGenerationRequest } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const excelFunctionDeclaration: FunctionDeclaration = {
  name: 'generate_excel',
  description: 'Generates a downloadable Excel (.xlsx) file with advanced data structures. Use this for reports, data analysis, financial models, or lists.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      filename: {
        type: Type.STRING,
        description: 'The name of the file to be downloaded (e.g., "sales_report_q3").',
      },
      sheets: {
        type: Type.ARRAY,
        description: 'An array of worksheets to include in the Excel file.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: 'The name of the worksheet tab.',
            },
            data: {
              type: Type.ARRAY,
              description: '2D array representing the rows and columns of the sheet. First row should usually be headers.',
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING, // Simplification: Gemini treats mixed types well as string/number in JSON
                  description: 'Cell value (string, number, or boolean).',
                }
              }
            }
          },
          required: ['name', 'data']
        }
      }
    },
    required: ['filename', 'sheets']
  },
};

const tools: Tool[] = [{ functionDeclarations: [excelFunctionDeclaration] }];

const modelName = 'gemini-3-flash-preview'; 

// System instruction to act as the orchestrator
const systemInstruction = `
You are Wumar Integrator, an advanced API orchestration system.
Your goal is to execute user requests precisely and efficiently.

Capabilities:
1.  **Conversation**: Chat intelligently about technical or general topics.
2.  **Excel Generation**: If a user asks for an Excel file, a spreadsheet, a report, or data export, you MUST use the 'generate_excel' tool.
    -   Generate realistic, professional data.
    -   Use multiple sheets if the data logically separates (e.g., "Summary" and "Raw Data").
    -   Ensure header rows are descriptive.
    -   Do not simply confirm you can do it; actually CALL the function.

Behavior:
-   Analyze the request complexity.
-   If the request implies data creation, formatting, or file output, route to the Excel tool immediately.
-   Keep responses concise and professional (terminal-style).
-   If you call a tool, describe what you are doing (e.g., "Initializing Data Structure...", "Compiling Report...").
`;

export const sendMessageToOrchestrator = async (
  history: any[], 
  message: string,
  onToolCall: (call: ExcelGenerationRequest) => void
): Promise<string> => {
  try {
    // Constructing a chat-like prompt sequence is better with the chat API
    const chat = ai.chats.create({
      model: modelName,
      config: {
        systemInstruction: systemInstruction,
        tools: tools,
        temperature: 0.4, // Lower temperature for more precise data generation
      },
      history: history // expecting standard Content objects
    });

    const result = await chat.sendMessage({ message });
    
    // Check for function calls
    const calls = result.functionCalls;
    
    if (calls && calls.length > 0) {
      for (const call of calls) {
        if (call.name === 'generate_excel') {
          // Execute the tool logic on the client side
          const args = call.args as unknown as ExcelGenerationRequest;
          onToolCall(args);
          
          // Send success response back to model to close the loop
          // Fix: The 'message' property should be used to pass parts for function responses.
          // Passing { parts: [...] } at the top level causes "ContentUnion is required" error 
          // because the SDK looks for 'message' or 'contents'.
          const functionResponse = await chat.sendMessage({
            message: [{
              functionResponse: {
                name: 'generate_excel',
                response: { result: 'File generated and downloaded successfully.' }
              }
            }]
          });
          
          return functionResponse.text || "Operation completed successfully.";
        }
      }
    }

    return result.text || "System standby.";

  } catch (error) {
    console.error("Gemini Orchestration Error:", error);
    return "Error: Unable to connect to Wumar Integrator Neural Grid. Verify API Connection.";
  }
};