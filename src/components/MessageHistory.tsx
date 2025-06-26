
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RotateCcw, User, Bot } from "lucide-react";

interface ChatMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  messageType?: string;
  timestamp: Date;
  formatted?: boolean;
}

interface MessageHistoryProps {
  messages: ChatMessage[];
  onResend: (message: ChatMessage) => void;
}

export const MessageHistory: React.FC<MessageHistoryProps> = ({ messages, onResend }) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const truncateContent = (content: string, maxLength: number = 80) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  if (messages.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Nenhuma mensagem no histórico</p>
        <p className="text-xs mt-1">Suas conversas aparecerão aqui</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {messages.map((message) => (
        <Card key={message.id} className={`p-3 ${
          message.type === 'question' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start gap-2">
            <div className={`p-1 rounded-full ${
              message.type === 'question' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-green-100 text-green-600'
            }`}>
              {message.type === 'question' ? (
                <User className="h-3 w-3" />
              ) : (
                <Bot className="h-3 w-3" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className={`text-xs font-medium ${
                  message.type === 'question' ? 'text-blue-700' : 'text-green-700'
                }`}>
                  {message.type === 'question' ? 'Você' : 'N8N'}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              
              <p className="text-sm text-gray-700 leading-tight">
                {truncateContent(message.content)}
              </p>
              
              {message.messageType && message.type === 'question' && (
                <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded-full ${
                  message.messageType === 'Texto' ? 'bg-blue-100 text-blue-700' :
                  message.messageType === 'Imagem' ? 'bg-purple-100 text-purple-700' :
                  message.messageType === 'Audio' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {message.messageType}
                </span>
              )}
              
              {message.type === 'question' && (
                <Button
                  onClick={() => onResend(message)}
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-6 px-2 text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Reenviar
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};
