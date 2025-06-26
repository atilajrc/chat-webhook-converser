
import React from 'react';

interface ResponseDisplayProps {
  content: string;
}

export const ResponseDisplay: React.FC<ResponseDisplayProps> = ({ content }) => {
  const formatResponse = (text: string) => {
    if (!text) return '';
    
    try {
      // Tentar parsear como JSON
      const parsed = JSON.parse(text);
      
      // Se for um array com um objeto que tem "output"
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].output) {
        const output = parsed[0].output;
        return formatMarkdownText(output);
      }
      
      // Se for JSON genérico, formatar com indentação
      return JSON.stringify(parsed, null, 2);
    } catch {
      // Se não for JSON, tentar formatar como markdown
      return formatMarkdownText(text);
    }
  };

  const formatMarkdownText = (text: string) => {
    return text
      // Converter listas markdown em HTML
      .replace(/^\*\s+/gm, '• ')
      // Converter texto em negrito **texto** 
      .replace(/\*\*(.*?)\*\*/g, '$1')
      // Quebrar linhas duplas
      .replace(/\n\n/g, '\n\n')
      // Melhorar formatação de dados estruturados
      .replace(/(\*\*D:\*\*|\*\*Título:\*\*|\*\*Criado em:\*\*|\*\*Esquema:\*\*)/g, '\n  $1');
  };

  const isJson = (text: string) => {
    try {
      JSON.parse(text);
      return true;
    } catch {
      return false;
    }
  };

  const renderFormattedContent = (formattedText: string) => {
    // Se for uma lista de documentos, renderizar de forma estruturada
    if (formattedText.includes('• ') && formattedText.includes('Título:')) {
      return (
        <div className="space-y-3">
          {formattedText.split('\n\n').map((section, index) => {
            if (section.trim().startsWith('Aqui estão os documentos')) {
              return (
                <div key={index} className="mb-4">
                  <h3 className="font-semibold text-gray-800 mb-3">{section.trim()}</h3>
                </div>
              );
            }
            
            if (section.includes('• ')) {
              const items = section.split('\n').filter(line => line.trim().startsWith('•'));
              return (
                <div key={index} className="space-y-2">
                  {items.map((item, itemIndex) => {
                    const cleanItem = item.replace('• ', '');
                    const parts = cleanItem.split(', ');
                    
                    return (
                      <div key={itemIndex} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-500">
                        <div className="space-y-1">
                          {parts.map((part, partIndex) => {
                            if (part.includes('D:')) {
                              const path = part.replace('D:', '').trim();
                              return (
                                <div key={partIndex} className="text-sm">
                                  <span className="font-medium text-blue-700">Arquivo:</span>
                                  <span className="ml-2 font-mono text-gray-700">{path}</span>
                                </div>
                              );
                            }
                            if (part.includes('Título:')) {
                              const title = part.replace('Título:', '').trim();
                              return (
                                <div key={partIndex} className="text-sm">
                                  <span className="font-medium text-green-700">Título:</span>
                                  <span className="ml-2 text-gray-800">{title}</span>
                                </div>
                              );
                            }
                            if (part.includes('Criado em:')) {
                              const date = part.replace('Criado em:', '').trim();
                              const formattedDate = new Date(date).toLocaleString('pt-BR');
                              return (
                                <div key={partIndex} className="text-sm">
                                  <span className="font-medium text-purple-700">Criado em:</span>
                                  <span className="ml-2 text-gray-600">{formattedDate}</span>
                                </div>
                              );
                            }
                            if (part.includes('Esquema:')) {
                              const schema = part.replace('Esquema:', '').trim();
                              return (
                                <div key={partIndex} className="text-sm">
                                  <span className="font-medium text-orange-700">Esquema:</span>
                                  <span className="ml-2 text-gray-600">{schema}</span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }
            
            return (
              <div key={index} className="text-gray-800 whitespace-pre-wrap">
                {section}
              </div>
            );
          })}
        </div>
      );
    }

    // Renderização padrão para outros tipos de conteúdo
    return (
      <pre className="whitespace-pre-wrap text-sm text-gray-800 break-words">
        {formattedText}
      </pre>
    );
  };

  if (!content) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Nenhuma resposta ainda</p>
        <p className="text-xs mt-1">A resposta do webhook aparecerá aqui</p>
      </div>
    );
  }

  const formattedContent = formatResponse(content);

  return (
    <div className="space-y-3">
      <div className={`p-4 rounded-lg border ${isJson(content) ? 'bg-gray-50' : 'bg-white'}`}>
        {renderFormattedContent(formattedContent)}
      </div>
    </div>
  );
};
