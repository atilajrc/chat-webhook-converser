
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Trash2, MessageSquare, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MessageHistory } from "./MessageHistory";
import { FileUpload } from "./FileUpload";
import { ResponseDisplay } from "./ResponseDisplay";

// ID fixo da requisição conforme solicitado
const REQUEST_ID = "n8n-webhook-chat-001";

interface ChatMessage {
  id: string;
  type: 'question' | 'answer';
  content: string;
  messageType?: string;
  timestamp: Date;
  formatted?: boolean;
}

export const ChatInterface = () => {
  const [message, setMessage] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('http://100.100.46.98:5678/webhook/bf4dd093-bb02-472c-9454-7ab9af97bd1d');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponse, setCurrentResponse] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const sendWebhookRequest = async (content: string, messageType: string) => {
    if (!webhookUrl.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira a URL do webhook N8N",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log("Enviando para webhook N8N:", { content, messageType, requestId: REQUEST_ID });

    try {
      const payload = {
        requestId: REQUEST_ID,
        content: content,
        messageType: messageType,
        timestamp: new Date().toISOString(),
      };

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const responseData = await response.text();
        
        // Adicionar pergunta ao histórico
        const questionMessage: ChatMessage = {
          id: Date.now().toString(),
          type: 'question',
          content: content,
          messageType: messageType,
          timestamp: new Date(),
        };

        // Adicionar resposta ao histórico
        const answerMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'answer',
          content: responseData,
          timestamp: new Date(),
          formatted: true,
        };

        setChatHistory(prev => [...prev, questionMessage, answerMessage]);
        setCurrentResponse(responseData);

        toast({
          title: "Sucesso",
          description: "Mensagem enviada com sucesso!",
        });
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Erro ao enviar webhook:", error);
      toast({
        title: "Erro",
        description: "Falha ao enviar para o webhook. Verifique a URL e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendText = async () => {
    if (!message.trim()) return;

    await sendWebhookRequest(message.trim(), "Texto");
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendText();
    }
  };

  const handleClearText = () => {
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleFileUpload = async (file: File, type: string) => {
    const fileName = file.name;
    await sendWebhookRequest(`Arquivo enviado: ${fileName}`, type);
  };

  const handleResendMessage = async (chatMessage: ChatMessage) => {
    if (chatMessage.type === 'question') {
      await sendWebhookRequest(chatMessage.content, chatMessage.messageType || "Texto");
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-4 p-4">
      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Configuração do Webhook */}
        <Card className="p-4 mb-4 flex-shrink-0">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">URL do Webhook N8N:</label>
            <input
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://your-n8n-instance.com/webhook/your-webhook-id"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500">ID da Requisição (fixo): {REQUEST_ID}</p>
          </div>
        </Card>

        {/* Área de resposta */}
        <Card className="flex-1 p-4 mb-4 overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">Resposta do Webhook</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <ResponseDisplay content={currentResponse} />
            </div>
          </div>
        </Card>

        {/* Área de entrada de texto e upload */}
        <Card className="p-4 flex-shrink-0">
          <div className="space-y-3">
            {/* Upload de arquivos */}
            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
            
            {/* Área de texto */}
            <div className="space-y-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                className="min-h-[80px] resize-none"
                disabled={isLoading}
              />
              
              {/* Botões */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSendText}
                  disabled={!message.trim() || isLoading}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isLoading ? 'Enviando...' : 'Enviar'}
                </Button>
                <Button
                  onClick={handleClearText}
                  variant="outline"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Histórico lateral */}
      <div className="lg:w-80 min-h-0">
        <Card className="h-full p-4">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <History className="h-5 w-5 text-green-600" />
              <h3 className="font-semibold text-gray-800">Histórico</h3>
            </div>
            <div className="flex-1 overflow-auto">
              <MessageHistory 
                messages={chatHistory} 
                onResend={handleResendMessage}
              />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
