
class ChatApp {
    constructor() {
        this.REQUEST_ID = "n8n-webhook-chat-001";
        this.chatHistory = [];
        this.isLoading = false;
        this.currentResponse = '';
        
        this.initializeElements();
        this.attachEventListeners();
        this.focusMessageInput();
    }

    initializeElements() {
        this.webhookUrlInput = document.getElementById('webhook-url');
        this.messageInput = document.getElementById('message-input');
        this.sendBtn = document.getElementById('send-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.responseContent = document.getElementById('response-content');
        this.historyContent = document.getElementById('history-content');
        
        // File upload elements
        this.imageBtn = document.getElementById('image-btn');
        this.imageInput = document.getElementById('image-input');
        this.documentBtn = document.getElementById('document-btn');
        this.documentInput = document.getElementById('document-input');
        this.audioBtn = document.getElementById('audio-btn');
        this.audioInput = document.getElementById('audio-input');
    }

    attachEventListeners() {
        // Text input events
        this.sendBtn.addEventListener('click', () => this.handleSendText());
        this.clearBtn.addEventListener('click', () => this.handleClearText());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // File upload events
        this.imageBtn.addEventListener('click', () => this.imageInput.click());
        this.documentBtn.addEventListener('click', () => this.documentInput.click());
        this.audioBtn.addEventListener('click', () => this.audioInput.click());

        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e, 'Imagem'));
        this.documentInput.addEventListener('change', (e) => this.handleFileSelect(e, 'Documento'));
        this.audioInput.addEventListener('change', (e) => this.handleFileSelect(e, 'Audio'));
    }

    focusMessageInput() {
        this.messageInput.focus();
    }

    async handleSendText() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        await this.sendWebhookRequest(message, "Texto");
        this.messageInput.value = '';
        this.focusMessageInput();
    }

    handleClearText() {
        this.messageInput.value = '';
        this.focusMessageInput();
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    async handleFileSelect(event, type) {
        const file = event.target.files?.[0];
        if (file) {
            try {
                console.log(`Arquivo selecionado: ${file.name}, Tipo: ${type}`);
                const base64 = await this.convertToBase64(file);
                await this.sendWebhookRequest(`Arquivo enviado: ${file.name}`, type, file.name, base64);
                event.target.value = '';
            } catch (error) {
                console.error('Erro ao converter arquivo para base64:', error);
                this.showToast('Falha ao processar o arquivo', 'error');
            }
        }
    }

    convertToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result;
                const base64Content = result.split(',')[1];
                resolve(base64Content);
            };
            reader.onerror = error => reject(error);
        });
    }

    async sendWebhookRequest(content, messageType, fileName = null, fileBase64 = null) {
        const webhookUrl = this.webhookUrlInput.value.trim();
        
        if (!webhookUrl) {
            this.showToast('Por favor, insira a URL do webhook N8N', 'error');
            return;
        }

        this.setLoading(true);
        console.log("Enviando para webhook N8N:", { 
            content, 
            messageType, 
            fileName, 
            hasFile: !!fileBase64, 
            requestId: this.REQUEST_ID 
        });

        try {
            const payload = {
                requestId: this.REQUEST_ID,
                content: content,
                messageType: messageType,
                timestamp: new Date().toISOString(),
            };

            if (fileName) payload.fileName = fileName;
            if (fileBase64) payload.fileBase64 = fileBase64;

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
                const questionMessage = {
                    id: Date.now().toString(),
                    type: 'question',
                    content: content,
                    messageType: messageType,
                    timestamp: new Date(),
                };

                // Adicionar resposta ao histórico
                const answerMessage = {
                    id: (Date.now() + 1).toString(),
                    type: 'answer',
                    content: responseData,
                    timestamp: new Date(),
                    formatted: true,
                };

                this.chatHistory.push(questionMessage, answerMessage);
                this.currentResponse = responseData;
                
                this.updateResponseDisplay();
                this.updateHistoryDisplay();

                this.showToast('Mensagem enviada com sucesso!', 'success');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        } catch (error) {
            console.error("Erro ao enviar webhook:", error);
            this.showToast('Falha ao enviar para o webhook. Verifique a URL e tente novamente.', 'error');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.isLoading = loading;
        
        // Update UI elements
        this.sendBtn.disabled = loading || !this.messageInput.value.trim();
        this.clearBtn.disabled = loading;
        this.imageBtn.disabled = loading;
        this.documentBtn.disabled = loading;
        this.audioBtn.disabled = loading;
        this.messageInput.disabled = loading;
        
        // Update button text
        this.sendBtn.innerHTML = loading ? 
            '<span class="icon">⏳</span> Enviando...' : 
            '<span class="icon">📤</span> Enviar';
    }

    updateResponseDisplay() {
        if (!this.currentResponse) {
            this.responseContent.innerHTML = `
                <div class="empty-response">
                    <p>Nenhuma resposta ainda</p>
                    <small>A resposta do webhook aparecerá aqui</small>
                </div>
            `;
            return;
        }

        const formattedContent = this.formatResponse(this.currentResponse);
        this.responseContent.innerHTML = `
            <div style="padding: 1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #f9fafb;">
                ${this.renderFormattedContent(formattedContent)}
            </div>
        `;
    }

    formatResponse(text) {
        if (!text) return '';
        
        try {
            const parsed = JSON.parse(text);
            
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].output) {
                const output = parsed[0].output;
                return this.formatMarkdownText(output);
            }
            
            return JSON.stringify(parsed, null, 2);
        } catch {
            return this.formatMarkdownText(text);
        }
    }

    formatMarkdownText(text) {
        return text
            .replace(/^\*\s+/gm, '• ')
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\n\n/g, '\n\n')
            .replace(/(\*\*D:\*\*|\*\*Título:\*\*|\*\*Criado em:\*\*|\*\*Esquema:\*\*)/g, '\n  $1');
    }

    renderFormattedContent(formattedText) {
        if (formattedText.includes('• ') && formattedText.includes('Título:')) {
            return this.renderStructuredContent(formattedText);
        }

        return `<pre style="white-space: pre-wrap; font-size: 0.875rem; color: #374151; word-break: break-words; font-family: inherit;">${formattedText}</pre>`;
    }

    renderStructuredContent(formattedText) {
        const sections = formattedText.split('\n\n');
        let html = '<div style="display: flex; flex-direction: column; gap: 0.75rem;">';

        sections.forEach(section => {
            if (section.trim().startsWith('Aqui estão os documentos')) {
                html += `<div style="margin-bottom: 1rem;"><h3 style="font-weight: 600; color: #1f2937; margin-bottom: 0.75rem;">${section.trim()}</h3></div>`;
            } else if (section.includes('• ')) {
                const items = section.split('\n').filter(line => line.trim().startsWith('•'));
                html += '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
                
                items.forEach(item => {
                    const cleanItem = item.replace('• ', '');
                    const parts = cleanItem.split(', ');
                    
                    html += '<div style="background: #f9fafb; padding: 0.75rem; border-radius: 0.5rem; border-left: 4px solid #3b82f6;">';
                    html += '<div style="display: flex; flex-direction: column; gap: 0.25rem;">';
                    
                    parts.forEach(part => {
                        if (part.includes('D:')) {
                            const path = part.replace('D:', '').trim();
                            html += `<div style="font-size: 0.875rem;"><span style="font-weight: 500; color: #1d4ed8;">Arquivo:</span><span style="margin-left: 0.5rem; font-family: monospace; color: #374151;">${path}</span></div>`;
                        } else if (part.includes('Título:')) {
                            const title = part.replace('Título:', '').trim();
                            html += `<div style="font-size: 0.875rem;"><span style="font-weight: 500; color: #059669;">Título:</span><span style="margin-left: 0.5rem; color: #1f2937;">${title}</span></div>`;
                        } else if (part.includes('Criado em:')) {
                            const date = part.replace('Criado em:', '').trim();
                            const formattedDate = new Date(date).toLocaleString('pt-BR');
                            html += `<div style="font-size: 0.875rem;"><span style="font-weight: 500; color: #7c3aed;">Criado em:</span><span style="margin-left: 0.5rem; color: #6b7280;">${formattedDate}</span></div>`;
                        } else if (part.includes('Esquema:')) {
                            const schema = part.replace('Esquema:', '').trim();
                            html += `<div style="font-size: 0.875rem;"><span style="font-weight: 500; color: #ea580c;">Esquema:</span><span style="margin-left: 0.5rem; color: #6b7280;">${schema}</span></div>`;
                        }
                    });
                    
                    html += '</div></div>';
                });
                
                html += '</div>';
            } else {
                html += `<div style="color: #1f2937; white-space: pre-wrap;">${section}</div>`;
            }
        });

        html += '</div>';
        return html;
    }

    updateHistoryDisplay() {
        if (this.chatHistory.length === 0) {
            this.historyContent.innerHTML = `
                <div class="empty-history">
                    <p>Nenhuma mensagem no histórico</p>
                    <small>Suas conversas aparecerão aqui</small>
                </div>
            `;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        
        this.chatHistory.forEach(message => {
            const isQuestion = message.type === 'question';
            const bgColor = isQuestion ? '#eff6ff' : '#f0fdf4';
            const borderColor = isQuestion ? '#bfdbfe' : '#bbf7d0';
            const nameColor = isQuestion ? '#1d4ed8' : '#047857';
            const avatarColor = isQuestion ? '#3b82f6' : '#10b981';
            
            html += `
                <div style="padding: 0.75rem; background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 0.5rem;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="display: flex; align-items: center; gap: 0.5rem;">
                            <div style="width: 0.75rem; height: 0.75rem; border-radius: 50%; background: ${avatarColor};"></div>
                            <span style="font-size: 0.75rem; font-weight: 500; color: ${nameColor};">
                                ${isQuestion ? 'Você' : 'N8N'}
                            </span>
                        </div>
                        <span style="font-size: 0.75rem; color: #6b7280;">
                            ${this.formatTime(message.timestamp)}
                        </span>
                    </div>
                    
                    <p style="font-size: 0.875rem; color: #374151; line-height: 1.4; word-break: break-word;">
                        ${this.truncateContent(message.content, 80)}
                    </p>
                    
                    ${message.messageType && isQuestion ? `
                        <span class="message-type-badge ${message.messageType.toLowerCase()}">
                            ${message.messageType}
                        </span>
                    ` : ''}
                    
                    ${isQuestion ? `
                        <button class="resend-btn" onclick="chatApp.handleResendMessage('${message.id}')">
                            🔄 Reenviar
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        html += '</div>';
        this.historyContent.innerHTML = html;
    }

    handleResendMessage(messageId) {
        const message = this.chatHistory.find(m => m.id === messageId);
        if (message && message.type === 'question') {
            this.sendWebhookRequest(message.content, message.messageType || "Texto");
        }
    }

    formatTime(date) {
        return date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    truncateContent(content, maxLength = 80) {
        if (content.length <= maxLength) return content;
        return content.substring(0, maxLength) + '...';
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        document.getElementById('toast-container').appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
