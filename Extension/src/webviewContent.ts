export function getWebviewContent(logoSrc: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Fira Sans','Segoe UI', sans-serif;
                font-size: 14px;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                color: black;
            }

            #chat {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 10px;
                background: #f9f9f9 url('${logoSrc}') center center no-repeat;
                background-size: 200px; /* Adjust size as needed */
                opacity: 1;
                }

            .message {
                max-width: 70%;
                padding: 10px;
                border-radius: 10px;
                white-space: pre-wrap;
                word-wrap: break-word;
                color: black;
                position: relative;
            }

            .user {
                align-self: flex-end;
                background-color: #d1e7ff;
                border-top-right-radius: 0;
            }

            .bot {
                align-self: flex-start;
                background-color: #e6e6e6;
                border-top-left-radius: 0;
            }

            #inputBar {
                display: flex;
                padding: 10px;
                background-color: #fff;
                border-top: 1px solid #ccc;
            }

            textarea {
                flex: 1;
                resize: none;
                height: 50px;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                border: 1px solid #ccc;
                margin-right: 10px;
                color: black;
                background-color: white;
            }

            button {
                padding: 10px 16px;
                font-size: 14px;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: transform 0.2s ease;
            }

            button:hover {
                transform: scale(1.05);
            }
            .spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #ccc;
            border-top: 3px solid #007acc;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-left: 10px;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

        </style>
    </head>
    <body>
        <div id="chat"></div>

        <div id="inputBar">
            <textarea id="input" placeholder="Type your prompt..."></textarea>
            <button onclick="send()">➤</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            function addMessage(text, sender) {
                const msg = document.createElement('div');
                msg.className = 'message ' + sender;
                msg.textContent = text;
                document.getElementById('chat').appendChild(msg);
                msg.scrollIntoView({ behavior: 'smooth' });
                return msg; 
            }

            function send() {
                const input = document.getElementById('input');
                const text = input.value.trim();
                if (!text) return;

                addMessage(text, 'user');
                input.value = '';

                const loadingMsg = addMessage("Generating response...", 'bot');
                const spinner = document.createElement('span');
                spinner.className = 'spinner';
                spinner.id = 'spinner';
                loadingMsg.appendChild(spinner);
                loadingMsg.id = "loading";

                loadingMsg.id = "loading";
                vscode.postMessage({ command: 'generate', text: text });                     
            }

            function createCopyButton(text) {
                const btn = document.createElement('button');
                btn.textContent = '📋';
                btn.title = 'Copy to clipboard';

                btn.style.position = 'absolute';
                btn.style.top = '8px';
                btn.style.right = '8px';
                btn.style.padding = '4px 6px';
                btn.style.fontSize = '12px';
                btn.style.backgroundColor = '#f3f3f3';
                btn.style.border = '1px solid #ccc';
                btn.style.borderRadius = '4px';
                btn.style.cursor = 'pointer';
                btn.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1)';

                btn.onclick = () => {
                    navigator.clipboard.writeText(text);
                    btn.textContent = '✅';
                    setTimeout(() => { btn.textContent = '📋'; }, 1500);
                };

                return btn;
            }

           window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'result') {
                const oldMsg = document.getElementById('loading');
                if (oldMsg) {
                    // Clear the loading message content (and spinner)
                    oldMsg.textContent = '';

                    // Create code block
                    const codeBlock = document.createElement('pre');
                    codeBlock.textContent = message.code;
                    codeBlock.style.whiteSpace = 'pre-wrap';
                    codeBlock.style.margin = '0';

                    // Add copy button
                    const copyBtn = createCopyButton(message.code);

                    // Append nicely formatted elements
                    oldMsg.appendChild(codeBlock);
                    oldMsg.appendChild(copyBtn);
                    oldMsg.removeAttribute('id');
                } else {
                    const msg = addMessage('', 'bot');
                    const codeBlock = document.createElement('pre');
                    codeBlock.textContent = message.code;
                    codeBlock.style.whiteSpace = 'pre-wrap';
                    codeBlock.style.margin = '0';

                    const copyBtn = createCopyButton(message.code);
                    msg.appendChild(codeBlock);
                    msg.appendChild(copyBtn);
                }
            }
        });

        </script>
    </body>
    </html>
    `;
}