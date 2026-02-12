import { BackendExecutionResponse } from './types';

export const sendMessageToOrchestrator = async (
  history: Array<{ role: string; content: string }>,
  message: string,
): Promise<BackendExecutionResponse> => {
  const response = await fetch('/api/execute', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ history, message }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  return response.json();
};
