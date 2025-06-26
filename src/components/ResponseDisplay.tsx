
import React from 'react';

interface ResponseDisplayProps {
  content: string;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ content }) => {
  const formatResponse = (text: string) => {
    if (!text) return '';
    
    // Tentar detectar JSON e formatá-lo
    try {
      const parsed = JSON.parse(text);
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Se não for JSON, retornar o texto original com quebras de linha preservadas
      return text;
    }
  };

  const isJson = (text: string) => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  };

  if (!content) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Nenhuma resposta ainda</p>
        <p className="text-xs mt-1">A resposta do webhook aparecerá aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`p-4 rounded-lg border ${isJson(content) ? 'bg-gray-50' : 'bg-white'}`}>
        <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 break-words">
          {formatResponse(content)}
        </pre>
      </div>
    </div>
  );
};
