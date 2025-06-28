
class ChatApp {
    constructor() {
        this.REQUEST_ID = "n8n-webhook-chat-001";
        this.chatHistory = [];
        this.isLoading = false;
        this.currentResponse = '';
        this.historyVisible = true;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.focusMessageInput();
        this.loadHistoryFromRedis();
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
        this.recordBtn = document.getElementById('record-btn');
        this.stopRecordBtn = document.getElementById('stop-record-btn');
    }

    attachEventListeners() {
        // Text input events
        this.sendBtn.addEventListener('click', () => this.handleSendText());
        this.clearBtn.addEventListener('click', () => this.handleClearText());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // File upload events
        this.imageBtn.addEventListener('click', () => this.imageInput.click());
        this.documentBtn.addEventListener('click', () => this.documentInput.click());
        this.audioBtn.addEventListener('click', () => this.showAudioOptions());

        this.imageInput.addEventListener('change', (e) => this.handleFileSelect(e, 'imageMessage'));
        this.documentInput.addEventListener('change', (e) => this.handleFileSelect(e, 'documentMessage'));
        this.audioInput.addEventListener('change', (e) => this.handleFileSelect(e, 'audioMessage'));

        // Audio recording events
        this.recordBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordBtn.addEventListener('click', () => this.stopRecording());

        // PDF export event
        this.exportPdfBtn.addEventListener('click', () => this.exportToPDF());

        // Response action events
        this.copyResponseBtn.addEventListener('click', () => this.copyResponse());
        this.clearResponseBtn.addEventListener('click', () => this.clearResponse());

        // History action events
        this.toggleHistoryBtn.addEventListener('click', () => this.toggleHistory());
        this.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    async loadHistoryFromRedis() {
        try {
            const response = await fetch('http://100.100.46.98:6379', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: 'GET',
                    key: this.REQUEST_ID,
                    db: 1
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.value) {
                    this.chatHistory = JSON.parse(data.value).reverse(); // Mais atual para menos atual
                    this.updateHistoryDisplay();
                }
            }
        } catch (error) {
            console.error('Erro ao carregar histórico do Redis:', error);
        }
    }

    async saveHistoryToRedis() {
        try {
            const response = await fetch('http://100.100.46.98:6379', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: 'SET',
                    key: this.REQUEST_ID,
                    value: JSON.stringify(this.chatHistory.slice().reverse()), // Salvar na ordem original
                    db: 1
                })
            });

            if (!response.ok) {
                console.error('Erro ao salvar histórico no Redis');
            }
        } catch (error) {
            console.error('Erro ao salvar histórico no Redis:', error);
        }
    }

    async clearHistoryFromRedis() {
        try {
            const response = await fetch('http://100.100.46.98:6379', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    command: 'DEL',
                    key: this.REQUEST_ID,
                    db: 1
                })
            });

            if (!response.ok) {
                console.error('Erro ao limpar histórico do Redis');
            }
        } catch (error) {
            console.error('Erro ao limpar histórico do Redis:', error);
        }
    }

    showAudioOptions() {
        const audioMenu = document.createElement('div');
        audioMenu.className = 'audio-menu';
        audioMenu.innerHTML = `
            <div class="audio-menu-content">
                <button id="record-option" class="audio-option-btn">
                    <span class="icon">🎤</span>
                    Gravar Áudio
                </button>
                <button id="upload-option" class="audio-option-btn">
                    <span class="icon">📁</span>
                    Enviar Arquivo
                </button>
                <button id="close-audio-menu" class="audio-option-btn close">
                    <span class="icon">❌</span>
                    Fechar
                </button>
            </div>
        `;

        document.body.appendChild(audioMenu);

        document.getElementById('record-option').addEventListener('click', () => {
            this.showAudioRecorder();
            audioMenu.remove();
        });

        document.getElementById('upload-option').addEventListener('click', () => {
            this.audioInput.click();
            audioMenu.remove();
        });

        document.getElementById('close-audio-menu').addEventListener('click', () => {
            audioMenu.remove();
        });
    }

    showAudioRecorder() {
        const recorderModal = document.createElement('div');
        recorderModal.className = 'recorder-modal';
        recorderModal.innerHTML = `
            <div class="recorder-content">
                <h3>Gravação de Áudio</h3>
                <div class="recorder-controls">
                    <button id="start-record" class="record-btn">
                        <span class="icon">🎤</span>
                        Iniciar Gravação
                    </button>
                    <button id="stop-record" class="record-btn" style="display: none;">
                        <span class="icon">⏹️</span>
                        Parar Gravação
                    </button>
                    <button id="send-record" class="record-btn" style="display: none;">
                        <span class="icon">📤</span>
                        Enviar Áudio
                    </button>
                </div>
                <div class="recording-status" id="recording-status"></div>
                <button id="close-recorder" class="close-recorder">Fechar</button>
            </div>
        `;

        document.body.appendChild(recorderModal);

        const startBtn = document.getElementById('start-record');
        const stopBtn = document.getElementById('stop-record');
        const sendBtn = document.getElementById('send-record');
        const statusDiv = document.getElementById('recording-status');
        const closeBtn = document.getElementById('close-recorder');

        startBtn.addEventListener('click', () => this.startRecording(startBtn, stopBtn, sendBtn, statusDiv));
        stopBtn.addEventListener('click', () => this.stopRecording(startBtn, stopBtn, sendBtn, statusDiv));
        sendBtn.addEventListener('click', () => this.sendRecordedAudio(recorderModal));
        closeBtn.addEventListener('click', () => recorderModal.remove());
    }

    async startRecording(startBtn, stopBtn, sendBtn, statusDiv) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                this.recordedAudio = audioBlob;
                sendBtn.style.display = 'inline-block';
                statusDiv.textContent = 'Gravação concluída. Clique em "Enviar Áudio" para enviar.';
            };

            this.mediaRecorder.start();
            this.isRecording = true;

            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            statusDiv.textContent = 'Gravando... Clique em "Parar Gravação" quando terminar.';
        } catch (error) {
            console.error('Erro ao iniciar gravação:', error);
            statusDiv.textContent = 'Erro ao acessar o microfone. Verifique as permissões.';
        }
    }

    stopRecording(startBtn, stopBtn, sendBtn, statusDiv) {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            
            stopBtn.style.display = 'none';
            statusDiv.textContent = 'Processando gravação...';
        }
    }

    async sendRecordedAudio(modal) {
        if (this.recordedAudio) {
            try {
                const base64 = await this.convertBlobToBase64(this.recordedAudio);
                const fileName = `audio_${Date.now()}.wav`;
                await this.sendWebhookRequest(`Áudio gravado: ${fileName}`, 'audioMessage', fileName, base64);
                modal.remove();
            } catch (error) {
                console.error('Erro ao enviar áudio gravado:', error);
                this.showToast('Falha ao enviar áudio gravado', 'error');
            }
        }
    }

    convertBlobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onload = () => {
                const result = reader.result;
                const base64Content = result.split(',')[1];
                resolve(base64Content);
            };
            reader.onerror = error => reject(error);
        });
    }

    focusMessageInput() {
        this.messageInput.focus();
    }

    async handleSendText() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        await this.sendWebhookRequest(message, "conversation");
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

                    // Adicionar no início para manter ordem mais atual primeiro
                    this.chatHistory.unshift(answerMessage, questionMessage);
                    await this.saveHistoryToRedis();
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

        let html = '<div style="display: flex; flex-direction: column; gap: 0.5rem;">';
        
        this.chatHistory.forEach(message => {
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
                        <span class="message-type-badge ${message.messageType.toLowerCase()}">
                            ${this.getMessageTypeDisplay(message.messageType)}
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

    getMessageTypeDisplay(messageType) {
        const typeMap = {
            'conversation': 'Texto',
            'imageMessage': 'Imagem',
            'audioMessage': 'Áudio',
            'documentMessage': 'Documento'
        };
        return typeMap[messageType] || messageType;
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

    async clearHistory() {
        this.chatHistory = [];
        await this.clearHistoryFromRedis();
        this.updateHistoryDisplay();
        this.showToast('Histórico limpo!', 'success');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.chatApp = new ChatApp();
});
