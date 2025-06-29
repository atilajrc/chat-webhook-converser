class ChatApp {
    constructor() {
        this.REQUEST_ID = "n8n-webhook-chat-001";
        this.chatHistory = [];
        this.isLoading = false;
        this.currentResponse = '';
        this.historyVisible = true;
        
        // Audio recording properties
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
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
        this.exportPdfBtn = document.getElementById('export-pdf-btn');
        this.copyResponseBtn = document.getElementById('copy-response-btn');
        this.clearResponseBtn = document.getElementById('clear-response-btn');
        this.toggleHistoryBtn = document.getElementById('toggle-history-btn');
        this.clearHistoryBtn = document.getElementById('clear-history-btn');
        this.historySidebar = document.querySelector('.history-sidebar');
        
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
        
        // Add input event listener to update button state
        this.messageInput.addEventListener('input', () => this.updateSendButtonState());

        // File upload events
        this.imageBtn.addEventListener('click', () => this.imageInput.click());
        this.documentBtn.addEventListener('click', () => this.documentInput.click());
        this.audioBtn.addEventListener('click', () => this.handleAudioButtonClick());

        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e, 'imageMessage'));
        this.documentInput.addEventListener('change', (e) => this.handleFileSelect(e, 'documentMessage'));
        this.audioInput.addEventListener('change', (e) => this.handleFileSelect(e, 'audioMessage'));

        // PDF export event
        this.exportPdfBtn.addEventListener('click', () => this.exportToPDF());

        // New response action events
        this.copyResponseBtn.addEventListener('click', () => this.copyResponse());
        this.clearResponseBtn.addEventListener('click', () => this.clearResponse());

        // History action events
        this.toggleHistoryBtn.addEventListener('click', () => this.toggleHistory());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    updateSendButtonState() {
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendBtn.disabled = !hasText || this.isLoading;
        
        if (this.isLoading) {
            this.sendBtn.innerHTML = '<span class="icon">⏳</span> Enviando...';
        } else {
            this.sendBtn.innerHTML = '<span class="icon">📤</span> Enviar';
        }
    }

    focusMessageInput() {
        this.messageInput.focus();
    }

    async handleSendText() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        await this.sendWebhookRequest(message, "conversation");
        this.messageInput.value = '';
        this.updateSendButtonState(); // Update button state after clearing
        this.focusMessageInput();
    }

    handleClearText() {
        this.messageInput.value = '';
        this.updateSendButtonState(); // Update button state after clearing
        this.focusMessageInput();
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.handleSendText();
        }
    }

    async handleAudioButtonClick() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                this.processRecordedAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.updateAudioButtonState();
            this.showToast('Gravação iniciada...', 'success');

        } catch (error) {
            console.error('Erro ao acessar microfone:', error);
            this.showToast('Erro ao acessar o microfone', 'error');
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.updateAudioButtonState();
            this.showToast('Gravação finalizada', 'success');
        }
    }

    updateAudioButtonState() {
        if (this.isRecording) {
            this.audioBtn.innerHTML = '<span class="icon">⏹️</span><span>Parar</span>';
            this.audioBtn.style.background = '#ef4444';
            this.audioBtn.style.color = 'white';
        } else {
            this.audioBtn.innerHTML = '<span class="icon">🎵</span><span>Áudio</span>';
            this.audioBtn.style.background = '';
            this.audioBtn.style.color = '';
        }
    }

    async processRecordedAudio(audioBlob) {
        try {
            const base64 = await this.convertBlobToBase64(audioBlob);
            const fileName = `audio_${new Date().getTime()}.webm`;
            await this.sendWebhookRequest(`Áudio gravado: ${fileName}`, "audioMessage", fileName, base64);
        } catch (error) {
            console.error('Erro ao processar áudio gravado:', error);
            this.showToast('Erro ao processar áudio gravado', 'error');
        }
    }

    convertBlobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const result = reader.result;
                const base64Content = result.split(',')[1];
                resolve(base64Content);
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(blob);
        });
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

    async sendWebhookRequest(content, messageType, fileName = null, fileBase64 = null, skipHistory = false) {
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
                
                if (!skipHistory) {
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
                }
                
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
        this.updateSendButtonState(); // Use the new method instead of inline logic
        
        // Update other UI elements
        this.clearBtn.disabled = loading;
        this.imageBtn.disabled = loading;
        this.documentBtn.disabled = loading;
        this.audioBtn.disabled = loading && !this.isRecording;
        this.messageInput.disabled = loading;
    }

    updateResponseDisplay() {
        if (!this.currentResponse) {
            this.responseContent.innerHTML = `
                <div class="empty-response">
                    <p>Nenhuma resposta ainda</p>
                    <small>A resposta do webhook aparecerá aqui</small>
                </div>
            `;
            this.exportPdfBtn.style.display = 'none';
            this.copyResponseBtn.style.display = 'none';
            this.clearResponseBtn.style.display = 'none';
            return;
        }

        const formattedContent = this.formatResponseAsPlainText(this.currentResponse);
        this.responseContent.innerHTML = `
            <div style="padding: 1rem; border-radius: 0.5rem; border: 1px solid #e5e7eb; background: #f9fafb;" id="pdf-content">
                <pre style="white-space: pre-wrap; font-size: 0.875rem; color: #374151; word-break: break-words; font-family: inherit;">${formattedContent}</pre>
            </div>
        `;
        this.exportPdfBtn.style.display = 'flex';
        this.copyResponseBtn.style.display = 'flex';
        this.clearResponseBtn.style.display = 'flex';
    }

    formatResponseAsPlainText(text) {
        if (!text) return '';
        
        try {
            const parsed = JSON.parse(text);
            
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].output) {
                return parsed[0].output;
            }
            
            return JSON.stringify(parsed, null, 2);
        } catch {
            return text;
        }
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

        // Sort history by timestamp, most recent first
        const sortedHistory = [...this.chatHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        
        sortedHistory.forEach(message => {
            const isQuestion = message.type === 'question';
            const bgColor = isQuestion ? '#eff6ff' : '#f0fdf4';
            const borderColor = isQuestion ? '#bfdbfe' : '#bbf7d0';
            const nameColor = isQuestion ? '#1d4ed8' : '#047857';
            const avatarColor = isQuestion ? '#3b82f6' : '#10b981';
            
            html += `
                <div class="message-item ${message.type}">
                    <div class="message-header">
                        <div style="width: 0.5rem; height: 0.5rem; border-radius: 50%; background: ${avatarColor};"></div>
                        <span style="font-size: 0.6rem; font-weight: 500; color: ${nameColor};">
                            ${isQuestion ? 'Você' : 'N8N'}
                        </span>
                        <span style="font-size: 0.6rem; color: #6b7280; margin-left: auto;">
                            ${this.formatTime(message.timestamp)}
                        </span>
                    </div>
                    
                    <div class="message-content">
                        ${this.truncateContent(message.content, 100)}
                    </div>
                    
                    ${message.messageType && isQuestion ? `
                        <span class="message-type-badge ${this.getMessageTypeBadgeClass(message.messageType)}">
                            ${this.getMessageTypeLabel(message.messageType)}
                        </span>
                    ` : ''}
                    
                    <div class="message-actions">
                        <button class="action-btn" onclick="chatApp.handleCopyMessage('${message.id}')">
                            📋 Copiar
                        </button>
                        ${isQuestion ? `
                            <button class="action-btn" onclick="chatApp.handleResendMessage('${message.id}')">
                                🔄 Reenviar
                            </button>
                        ` : `
                            <button class="action-btn" onclick="chatApp.handleViewDetails('${message.id}')">
                                👁️ Ver Detalhes
                            </button>
                        `}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        this.historyContent.innerHTML = html;
    }

    getMessageTypeBadgeClass(messageType) {
        switch(messageType) {
            case 'conversation': return 'texto';
            case 'imageMessage': return 'imagem';
            case 'audioMessage': return 'audio';
            case 'documentMessage': return 'documento';
            default: return 'texto';
        }
    }

    getMessageTypeLabel(messageType) {
        switch(messageType) {
            case 'conversation': return 'Texto';
            case 'imageMessage': return 'Imagem';
            case 'audioMessage': return 'Áudio';
            case 'documentMessage': return 'Documento';
            default: return 'Texto';
        }
    }

    async handleCopyMessage(messageId) {
        const message = this.chatHistory.find(m => m.id === messageId);
        if (message) {
            try {
                await navigator.clipboard.writeText(message.content);
                this.showToast('Conteúdo copiado!', 'success');
            } catch (error) {
                console.error('Erro ao copiar:', error);
                this.showToast('Falha ao copiar conteúdo', 'error');
            }
        }
    }

    handleResendMessage(messageId) {
        const message = this.chatHistory.find(m => m.id === messageId);
        if (message && message.type === 'question') {
            this.sendWebhookRequest(message.content, message.messageType || "conversation", null, null, true);
        }
    }

    handleViewDetails(messageId) {
        const message = this.chatHistory.find(m => m.id === messageId);
        if (message && message.type === 'answer') {
            this.currentResponse = message.content;
            this.updateResponseDisplay();
        }
    }

    exportToPDF() {
        const element = document.getElementById('pdf-content');
        const opt = {
            margin: 1,
            filename: `webhook-response-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        
        html2pdf().set(opt).from(element).save();
    }

    formatTime(date) {
        return date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    truncateContent(content, maxLength = 100) {
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

    copyResponse() {
        if (!this.currentResponse) {
            this.showToast('Nenhuma resposta para copiar', 'error');
            return;
        }

        const formattedContent = this.formatResponseAsPlainText(this.currentResponse);
        
        navigator.clipboard.writeText(formattedContent).then(() => {
            this.showToast('Resposta copiada!', 'success');
        }).catch((error) => {
            console.error('Erro ao copiar resposta:', error);
            this.showToast('Falha ao copiar resposta', 'error');
        });
    }

    clearResponse() {
        this.currentResponse = '';
        this.updateResponseDisplay();
        this.showToast('Resposta limpa!', 'success');
    }

    toggleHistory() {
        this.historyVisible = !this.historyVisible;
        
        if (this.historyVisible) {
            this.historySidebar.style.display = 'flex';
            this.toggleHistoryBtn.innerHTML = '<span class="icon">👁️</span> Ocultar';
        } else {
            this.historySidebar.style.display = 'none';
            this.toggleHistoryBtn.innerHTML = '<span class="icon">👁️</span> Mostrar';
        }
    }

    clearHistory() {
        this.chatHistory = [];
        this.updateHistoryDisplay();
        this.showToast('Histórico limpo!', 'success');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
