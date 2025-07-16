import * as vscode from 'vscode';

export function getChatbotWebviewContent(logoSrc: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🤖 CodeGenie Chatbot</title>
        <style>
            :root {
                --background-color: #1e1e1e;
                --text-color: #d4d4d4;
                --input-background: #3c3c3c;
                --input-border: #5a5a5a;
                --button-bg: #0e639c;
                --button-hover-bg: #1177bb;
                --button-secondary-bg: #4a4d51;
                --button-secondary-hover-bg: #4a4d51;
            }
            .light-theme {
                --bg: #ffffff;
                --fg: #000000;
                --user-bg: #007acc;
                --bot-bg: #e6e6e6;
                --bot-message-bg: #aba8a8ff;
                --user-message-bg: #068ae9ff;
            }
            .dark-theme {
                --bg: #1e1e1e;
                --fg: #d4d4d4;
                --user-bg: #264f78;
                --bot-bg: #333333;
                --bot-message-bg: #2d2d2d;
                --user-message-bg: #04395e;
            }
            body {
                font-family: var(--vscode-font-family, 'Segoe UI', 'Roboto', sans-serif);
                background-color: var(--background-color);
                color: var(--fg);
                background-color: var(--bg);
                transition: background-color 0.3s ease, color 0.3s ease;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
            }
            #themeToggle {
            top: 10px;
            left: 10px;
            font-size: 16px;
            padding: 6px 12px;
            border-radius: 5px;
            background-color: var(--bot-bg);
            color: var(--fg);
            border: none;
            cursor: pointer;
            margin: 0 10px;
            }
            .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 10px 20px;
                background-color: var(--bot-message-bg);
                border-bottom: 1px solid var(--input-border);
            }
            .header h1 {
                font-size: 20px;
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .header img {
                width: 24px;
                height: 24px;
            }
            .header select {
                background-color: var(--input-background);
                color: var(--text-color);
                border: 1px solid var(--input-border);
                border-radius: 4px;
                padding: 4px 8px;
                font-family: inherit; 
            }
            #chat-container {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .message {
                max-width: 80%;
                padding: 10px 15px;
                border-radius: 12px;
                line-height: 1.5;
                word-wrap: break-word;
            }
            .bot {
                align-self: flex-start;
                background-color: var(--bot-message-bg);
                border-top-left-radius: 0;
            }
            .loader 
            {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #d4d4d4;
            border-top: 3px solid transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 10px;
            }
            @keyframes spin 
            {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
            }
            .user {
                align-self: flex-end;
                background-color: var(--user-message-bg);
                border-top-right-radius: 0;
            }
            .mcq-options {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 10px;
            }
            .mcq-btn {
                background-color: var(--button-secondary-bg);
                color: var(--text-color);
                border: 1px solid var(--input-border);
                border-radius: 20px;
                padding: 8px 15px;
                cursor: pointer;
                transition: background-color 0.2s;
            }
            .mcq-btn:hover {
                background-color: var(--button-secondary-hover-bg);
            }
            .input-bar {
                display: flex;
                padding: 15px;
                background-color: var(--bot-message-bg);
                border-top: 1px solid var(--input-border);
            }
            textarea {
                flex: 1;
                resize: none;
                padding: 10px;
                border-radius: 6px;
                border: 1px solid var(--input-border);
                background-color: var(--input-background);
                color: var(--text-color);
                font-family: inherit;
                font-size: 14px;
                margin-right: 10px;
            }
            .send-btn {
                padding: 10px 18px;
                font-size: 16px;
                background-color: var(--button-bg);
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
            .send-btn:hover {
                background-color: var(--button-hover-bg);
            }
            pre {
                background:#727272;
                padding: 1em;
                border-radius: 4px;
                overflow-x: auto;
                white-space: pre-wrap;
            }
            .code-actions {
                display: flex;
                gap: 5px;
                margin-top: 10px;
            }
            .code-actions button {
                font-size: 12px;
                padding: 4px 8px;
            }
            details {
                border: 1px solid var(--input-border);
                border-radius: 5px;
                margin-top: 10px;
            }
            summary {
                cursor: pointer;
                padding: 10px;
                background-color: var(--button-secondary-bg);
            }
            .panel-content {
                padding: 10px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="title"><h1>🤖 CodeGenie Chatbot</h1></div>
            <div class="right-controls">
            <select id="mode-selector">
                <option value="General">General</option>
                <option value="Intelligent Snippet">Intelligent Snippet</option>
                <option value="Auto Completion">Auto Completion</option>
                <option value="Code Suggestion">Code Suggestion</option>
            </select>
            <button id="themeToggle">🌙</button>
        </div>
        </div>
        <div id="chat-container">
            <div class="message bot">Hello! I'm CodeGenie. How can I assist you today? Select a mode and type your prompt below.</div>
        </div>
        <div class="input-bar">
            <textarea id="input" placeholder="Type your prompt here..."></textarea>
            <button class="send-btn" onclick="send()">➤</button>
        </div>
        <script>
            const vscode = acquireVsCodeApi();
            const storedState = vscode.getState();
            const preferredTheme = storedState?.theme || 'dark-theme';
            const body = document.body;
            const toggleBtn = document.getElementById('themeToggle');
            body.classList.add(preferredTheme);
            toggleBtn.textContent = preferredTheme === 'dark-theme' ? '🌙' : '☀️';
            toggleBtn.addEventListener('click', () => {
                const isDark = body.classList.contains('dark-theme');
                body.classList.toggle('light-theme', isDark);
                body.classList.toggle('dark-theme', !isDark);
                const newTheme = isDark ? 'light-theme' : 'dark-theme';
                toggleBtn.textContent = isDark ? '☀️' : '🌙';
                vscode.setState({ theme: newTheme });
            });
            const chatContainer = document.getElementById('chat-container');
            const input = document.getElementById('input');
            const modeSelector = document.getElementById('mode-selector');
            let conversationState = {
                prompt: null,
                mode: null,
                awaiting: null 
            };
            function addMessage(text, sender, element) {
                const msg = document.createElement('div');
                msg.className = 'message ' + sender;
                if (text) msg.textContent = text;
                if (element) msg.appendChild(element);
                chatContainer.appendChild(msg);
                msg.scrollIntoView({ behavior: 'smooth' });
                return msg;
            }
            function send() {
                const text = input.value.trim();
                if (!text) return;
                addMessage(text, 'user');
                input.value = '';
                conversationState.prompt = text;
                const selectedMode = modeSelector.value;
                if (selectedMode === 'General') {
                    conversationState.awaiting = 'mode';
                    askForMode();
                } else {
                    conversationState.mode = selectedMode;
                    conversationState.awaiting = 'output';
                    askForOutputType();
                }
            }
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                }
            });
            function askForMode() {
                const optionsContainer = document.createElement('div');
                optionsContainer.className = 'mcq-options';
                const modes = ['Intelligent Snippet', 'Auto Completion', 'Code Suggestion'];
                modes.forEach(mode => {
                    const btn = document.createElement('button');
                    btn.className = 'mcq-btn';
                    btn.textContent = mode;
                    btn.onclick = () => {
                        conversationState.mode = mode;
                        addMessage('Selected mode: ' + mode, 'user');
                        optionsContainer.remove();
                        askForOutputType();
                    };
                    optionsContainer.appendChild(btn);
                });
                addMessage('Which mode would you like to proceed with?', 'bot', optionsContainer);
            }
            function askForOutputType() {
                const optionsContainer = document.createElement('div');
                optionsContainer.className = 'mcq-options';
                const outputTypes = ['Inline Mode', 'Panel Mode'];
                outputTypes.forEach(type => {
                    const btn = document.createElement('button');
                    btn.className = 'mcq-btn';
                    btn.textContent = type;
                    btn.onclick = () => {
                        addMessage('Output choice: ' + type, 'user');
                        optionsContainer.remove();
                        callBackend(type.split(' ')[0].toLowerCase());
                    };
                    optionsContainer.appendChild(btn);
                });
                addMessage('Where do you want the output?', 'bot', optionsContainer);
            }
            function callBackend(outputType) {
                 addMessage('Thinking...', 'bot');
                 vscode.postMessage({
                    command: 'callBackend',
                    prompt: conversationState.prompt,
                    mode: conversationState.mode,
                    outputType: outputType
                 });
            }
            function parseCodeSuggestions(responseText) {
                const solutions = [];
                const parts = responseText.split(/(Solution\\s*\\d+\\s*:\\s*(?:Using\\s*(?:functions|recursion|iteration))?)/);
                for (let i = 1; i < parts.length; i += 2) {
                    const header = parts[i].trim();
                    const body = (parts[i + 1] || '').trim();
                    if (body) {
                        solutions.push({ header: header, code: body });
                    }
                }
                return solutions;
            }
            function createCodeBlock(data, mode) {
                const container = document.createElement('div');
                const blockId = 'block-' + Date.now();
                container.setAttribute('data-block-id', blockId);
                function createCollapsibleSection(title, content, isOpen = false) {
                    const details = document.createElement('details');
                    details.style.marginBottom = '10px'; 
                    if (isOpen) {
                        details.setAttribute('open', '');
                    }
                    const summary = document.createElement('summary');
                    summary.textContent = title;
                    details.appendChild(summary);
                    const contentDiv = document.createElement('div');
                    contentDiv.className = 'panel-content'; 
                    if (typeof content === 'string') {
                        const pre = document.createElement('pre');
                        pre.textContent = content;
                        contentDiv.appendChild(pre);
                    } else if (content instanceof HTMLElement) {
                        contentDiv.appendChild(content);
                    }
                    details.appendChild(contentDiv);
                    return details;
                }
                if (mode === 'Auto Completion' && typeof data === 'object') {
                    const debugAnalysis = data.debug_explanation || 'No debug analysis was provided.';
                    container.appendChild(createCollapsibleSection('Debug Analysis', debugAnalysis));
                    const completedCode = data.completed_code || JSON.stringify(data, null, 2);
                    const completedCodeContainer = document.createElement('div');
                    const preCompletedCode = document.createElement('pre');
                    preCompletedCode.textContent = completedCode;
                    completedCodeContainer.appendChild(preCompletedCode);
                    const actions = document.createElement('div');
                    actions.className = 'code-actions';
                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = 'Copy';
                    copyBtn.className = 'mcq-btn';
                    copyBtn.onclick = () => navigator.clipboard.writeText(completedCode);
                    const insertBtn = document.createElement('button');
                    insertBtn.textContent = 'Insert';
                    insertBtn.className = 'mcq-btn';
                    insertBtn.onclick = () => vscode.postMessage({ command: 'insertCode', code: completedCode, blockId });
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.className = 'mcq-btn';
                    deleteBtn.onclick = () => vscode.postMessage({ command: 'deleteCode', blockId });
                    actions.append(copyBtn, insertBtn, deleteBtn);
                    completedCodeContainer.appendChild(actions);
                    container.appendChild(createCollapsibleSection('Autocompleted Code', completedCodeContainer, true));
                    const explanation = data.explanation || 'No explanation was provided.';
                    container.appendChild(createCollapsibleSection('Explanation', explanation));
                    const example = data.example || 'No example was provided.';
                    container.appendChild(createCollapsibleSection('Example', example));
                } 
                    else if (mode === 'Intelligent Snippet' && typeof data === 'object') {
                    const displayCode = data.code || JSON.stringify(data, null, 2);
                    const pre = document.createElement('pre');
                    pre.textContent = displayCode;
                    container.appendChild(pre);
                    const actions = document.createElement('div');
                    actions.className = 'code-actions';
                    const copyBtn = document.createElement('button');
                    copyBtn.textContent = 'Copy';
                    copyBtn.className = 'mcq-btn';
                    copyBtn.onclick = () => navigator.clipboard.writeText(displayCode);
                    const insertBtn = document.createElement('button');
                    insertBtn.textContent = 'Insert';
                    insertBtn.className = 'mcq-btn';
                    insertBtn.onclick = () => vscode.postMessage({ command: 'insertCode', code: displayCode, blockId });
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Delete';
                    deleteBtn.className = 'mcq-btn';
                    deleteBtn.onclick = () => vscode.postMessage({ command: 'deleteCode', blockId });
                    actions.append(copyBtn, insertBtn, deleteBtn);
                    pre.appendChild(actions);
                    container.appendChild(createCollapsibleSection('Snippet', pre, true));
                } 
                    else if (mode === 'Code Suggestion') {
                    const solutions = parseCodeSuggestions(data.response || '');
                    if (solutions.length === 0) {
                        const pre = document.createElement('pre');
                        pre.textContent = "No code suggestions found.";
                        container.appendChild(pre);
                        return container;
                    }
                    solutions.forEach((sol, idx) => {
                        const solutionBox = document.createElement('div');
                        solutionBox.className = 'solution-box';
                        const header = document.createElement('h4');
                        header.textContent = sol.header;
                        solutionBox.appendChild(header);
                        const pre = document.createElement('pre');
                        pre.textContent = sol.code;
                        solutionBox.appendChild(pre);
                        const actions = document.createElement('div');
                        actions.className = 'code-actions';
                        const blockId = 'block-' + Date.now() + '-' + idx;
                        const copyBtn = document.createElement('button');
                        copyBtn.textContent = 'Copy';
                        copyBtn.className = 'mcq-btn';
                        copyBtn.onclick = () => navigator.clipboard.writeText(sol.code);
                        const insertBtn = document.createElement('button');
                        insertBtn.textContent = 'Insert';
                        insertBtn.className = 'mcq-btn';
                        insertBtn.onclick = () => vscode.postMessage({ command: 'insertCode', code: sol.code, blockId: blockId });
                        const deleteBtn = document.createElement('button');
                        deleteBtn.textContent = 'Delete';
                        deleteBtn.className = 'mcq-btn';
                        deleteBtn.onclick = () => {
                            vscode.postMessage({ command: 'deleteCode', blockId: blockId });
                        };
                        actions.append(copyBtn, insertBtn, deleteBtn);
                        solutionBox.appendChild(actions);
                        container.appendChild(solutionBox);
                        container.appendChild(createCollapsibleSection('Solution', solutionBox, true));
                    });                    
                } 
                return container;
            }
            window.addEventListener('message', event => {
                const message = event.data;
                const thinkingMsg = Array.from(chatContainer.querySelectorAll('.message.bot')).pop();
                if (thinkingMsg && thinkingMsg.textContent=='Thinking...') {
                    thinkingMsg.remove();
                }
                switch(message.command) {
                    case 'backendResponse':
                        if (message.outputType === 'inline') {
                            let codeToDisplay = '';
                            if (message.mode === 'Auto Completion' && typeof message.data === 'object' && message.data.completed_code) {
                                codeToDisplay = message.data.completed_code;
                            } else if (message.mode === 'Intelligent Snippet' && typeof message.data === 'object' && message.data.code) {
                                codeToDisplay = message.data.code;
                            } else if (message.mode === 'Code Suggestion' && typeof message.data === 'object' && message.data.response) {
                                codeToDisplay = message.data.response;
                            } else {
                                codeToDisplay = typeof message.data === 'object' ? JSON.stringify(message.data, null, 2) : String(message.data);
                            }
                            const pre = document.createElement('pre');
                            pre.textContent = codeToDisplay;
                            addMessage(null, 'bot', pre);
                        } else { 
                            const details = document.createElement('details');
                            const summary = document.createElement('summary');
                            summary.textContent = 'CodeGenie Response';
                            details.appendChild(summary);
                            const panelContent = document
                            .createElement('div');
                            panelContent.className = 'panel-content';
                            const codeBlock = createCodeBlock(message.data, message.mode);
                            panelContent.appendChild(codeBlock);
                            details.appendChild(panelContent); 
                            addMessage(null, 'bot', panelContent);
                        }
                        break;
                    case 'showError':
                        addMessage('Error: ' + message.message, 'bot');
                        break;
                    case 'setChatbotMode':
                        const mode = message.mode;
                        conversationState.mode = mode;
                        modeSelector.value = mode;
                        addMessage('Chatbot mode set to: ' + mode, 'bot');
                        break;
                }
            });
        </script>
    </body>
    </html>
    `;
}

export function getaboutviewContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>About CodeGenie</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 14px;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                height: 100vh;
                color: white; 
                background-color: black; 
            }
            .container {
                max-width: 800px;
                margin: auto;
                padding: 25px;
                background-color: #333;
                border-radius: 8px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5); 
                text-align: center;
                overflow-y: auto; 
            }
            .header {
                display: flex;
                flex-direction: column;
                align-items: center;
                margin-bottom: 25px;
            }
            h1 {
                font-size: 2em;
                color: #00BFFF; 
                margin-bottom: 10px;
            }
            h2 {
                font-size: 1.5em;
                color: #00BFFF; 
                margin-top: 25px;
                margin-bottom: 10px;
                text-align: left;
            }
            h3 {
                font-size: 1.2em;
                color: #00BFFF; 
                margin-top: 20px;
                margin-bottom: 8px;
                text-align: left;
            }
            p{
                line-height: 1.6;
                margin-bottom: 15px;
                text-align: left;
                color: #E0E0E0; 
            }
            ul{
                list-style-type: disc;
                margin-left: 20px;
                margin-bottom: 15px;
                text-align: left;
            }
            li{
                margin-bottom: 8px;
                color: #E0E0E0; 
            }
            a{
                color: #61DAFB; 
                text-decoration: none;
            }
            a:hover{
                text-decoration: underline;
            }
            .footer-message {
                margin-top: 20px;
                font-size: 0.9em;
                color: #AAAAAA; 
                text-align: center;
            }
            .key {
                background-color: #555; 
                padding: 2px 5px;
                border-radius: 3px;
                font-family: monospace;
                font-weight: bold;
                color: white; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>ℹ️ About CodeGenie</h1>
            </div>
            <p><strong>CodeGenie</strong> is an intelligent coding assistant that leverages the power of AI to help you write, complete, debug, and understand code more efficiently. Whether you're drafting new logic, improving existing snippets, or exploring creative implementations, CodeGenie is your reliable development partner.</p>
            <h2>🔮 Key Features</h2>
            <h3>💡 1. Intelligent Snippet Generation</h3>
            <p>Quickly generate context-aware code snippets tailored to your needs. Use this when you want the AI to generate a block of code based on your comments, function names, or logic hints.</p>
            <ul>
                <li><strong>⚡ Inline Snippet <span class="key">[Shift+I]</span>:</strong> Instantly inserts a relevant snippet at your cursor location without leaving your current view.</li>
                <li><strong>📋 Panel Snippet <span class="key">[Shift+P]</span>:</strong> Launches a chatbot interface where you can input a prompt to receive a structured, AI-generated snippet.</li>
            </ul>
            <h3>✨ 2. Autocompletion</h3>
            <p>Complete partial code or unfinished functions with intelligent context-based generation. Use this when you want thorough insight or suspect bugs in your code. Best used when you're in the middle of writing code and need a full working version of what you’ve started.</p>
            <ul>
                <li><strong>⚡ Inline Autocomplete <span class="key">[Alt+I]</span>:</strong> Instantly inserts the completed version of the input code. Ideal for fast-paced development or when working with short code files.</li>
                <li><strong>📋 Panel Autocomplete <span class="key">[Alt+P]</span>:</strong> Launches a chatbot interface where you can input a prompt to receive a detailed panel showing: Debug Analysis, Autocompleted Code, Explanation and Example.</li>
            </ul>
            <h3>🗎 3. Code Suggestions</h3>
            <p>Get multiple intelligent suggestions and toggle between them for flexible experimentation. Great when you're unsure of the best approach or want to compare alternatives.</p>
            <ul>
                <li><strong>⚡ Inline Suggestions <span class="key">[Ctrl+I]</span>:</strong> Installs suggestions inline for rapid comparison and direct editing.</li>
                <li><strong>⏩ Quick Actions for Inline Suggestions:</strong>
                    <ul>
                        <li><span class="key">Press Key 1, 2, 3</span>: Insert suggestion 1, 2, or 3.</li>
                        <li><span class="key">Ctrl+1, Ctrl+2, Ctrl+3</span>: Revert to the solution options.</li>
                        <li><span class="key">Esc</span>: Clear suggestions.</li>
                    </ul>
                </li>
                <li><strong>📋 Panel Suggestions <span class="key">[Ctrl+P]</span>:</strong> Launches a chatbot interface where you can input a prompt to receive multiple code suggestion versions.</li>
            </ul>
            <h2>🧭 Usage Guide</h2>
            <ul>
                <li><strong>🪄 Top-right Editor Buttons:</strong> Intelligent Snippet 💡, Autocompletion ✨, Code Suggestion 🗎, CodeGenie Chatbot 🤖</li>
                <li><strong>🧠 Sub-feature Selection:</strong> When triggering features via buttons, a pop-up menu appears—use it to choose between inline or panel mode.</li>
                <li><strong>🤖 CodeGenie Chatbot</strong> allows you to interact conversationally with the bot, ask follow-up queries, or generate ideas. It features a collapsible chat interface designed for productive assistance.</li>
                <li><strong>✍ Provide Context:</strong> Comments, partial code, or logical hints to improve generation quality.</li>
                <li><strong>🎯 Edit and Review:</strong> Use generated code as a base and fine-tune it to match your style or requirements.</li>
            </ul>
            <h2>⚠️ Caution</h2>
                <p>To Avoid Errors, Follow These Guidelines Carefully. Failure to follow these steps correctly might result in unexpected behavior or no output.<p>
            <ul>
                <li><strong>Use Keys or Buttons Correctly:</strong> Always select the desired text before using shortcut keys or command buttons.</li>
                <li><strong>Maintain Active Text Editor:</strong>  The panel shows "Thinking..." during generation. For inline mode, place the cursor where output should appear.</li>
                <li><strong>Panel Buttons:</strong> Keep cursor active in the editor, then press [Shift] + Insert/Delete to apply actions.</li>
                <li><strong>Inline Intelligent Snippet:</strong> Write your prompt as a comment, place the cursor at the desired spot, select the prompt, then trigger with a shortcut or button.</li>
            </ul>
            <h2>🔗 Source Code</h2>
            <p>CodeGenie is open source! You can find the repository on GitHub: <a href="https://github.com/kmecofficial/CodeGenie-G413-PS25" target="_blank">https://github.com/kmecofficial/CodeGenie-G413-PS25</a></p>
            <p>Let CodeGenie be your coding companion — always ready to turn your ideas into working code. 🧞</p>
        </div>
    </body>
    </html>
    `;
}
