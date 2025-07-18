
import React, { useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, Volume2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFileUpload: (fileName: string, fileBase64: string, type: string) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, isLoading }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove o prefixo "data:tipo/subtipo;base64," para enviar apenas o conteúdo base64
        const base64Content = result.split(',')[1];
        resolve(base64Content);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        console.log(`Arquivo selecionado: ${file.name}, Tipo: ${type}`);
        const base64 = await convertToBase64(file);
        onFileUpload(file.name, base64, type);
        // Limpar o input para permitir selecionar o mesmo arquivo novamente
        event.target.value = '';
      } catch (error) {
        console.error('Erro ao converter arquivo para base64:', error);
        toast({
          title: "Erro",
          description: "Falha ao processar o arquivo",
          variant: "destructive",
        });
      }
    }
  };

  const validateAndUpload = (inputRef: React.RefObject<HTMLInputElement>, type: string, acceptedTypes: string[]) => {
    if (inputRef.current) {
      inputRef.current.click();
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Upload de Imagem */}
      <Button
        onClick={() => validateAndUpload(imageInputRef, "Imagem", ["image/*"])}
        variant="outline"
        disabled={isLoading}
        className="flex flex-col items-center py-3 h-auto"
      >
        <Image className="h-5 w-5 mb-1" />
        <span className="text-xs">Imagem</span>
      </Button>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileSelect(e, "Imagem")}
        className="hidden"
      />

      {/* Upload de Documento */}
      <Button
        onClick={() => validateAndUpload(documentInputRef, "Documento", [".pdf,.doc,.docx,.txt"])}
        variant="outline"
        disabled={isLoading}
        className="flex flex-col items-center py-3 h-auto"
      >
        <FileText className="h-5 w-5 mb-1" />
        <span className="text-xs">Documento</span>
      </Button>
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
        onChange={(e) => handleFileSelect(e, "Documento")}
        className="hidden"
      />

      {/* Upload de Áudio */}
      <Button
        onClick={() => validateAndUpload(audioInputRef, "Audio", ["audio/*"])}
        variant="outline"
        disabled={isLoading}
        className="flex flex-col items-center py-3 h-auto"
      >
        <Volume2 className="h-5 w-5 mb-1" />
        <span className="text-xs">Áudio</span>
      </Button>
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={(e) => handleFileSelect(e, "Audio")}
        className="hidden"
      />
    </div>
  );
};
