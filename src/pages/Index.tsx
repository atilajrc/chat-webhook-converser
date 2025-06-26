
import { ChatInterface } from "@/components/ChatInterface";

const Index = () => {
  return (
    <div className="h-screen w-full overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="h-full flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-800">N8N Webhook Chat</h1>
          <p className="text-sm text-gray-600">Sistema de chat integrado com webhook N8N</p>
        </header>
        <div className="flex-1 overflow-hidden">
          <ChatInterface />
        </div>
      </div>
    </div>
  );
};

export default Index;
