import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('codegenie.generateSnippet', () => {
        const panel = vscode.window.createWebviewPanel(
            'codegeniePanel',
            'CodeGenie ✨',
            vscode.ViewColumn.Beside,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'generate') {
                    try {
                        const response = await axios.post('http://localhost:5000/generate-snippet', {
                            context: message.text,
                            language: 'python'
                        });
                        const code = response.data.code;
                        panel.webview.postMessage({ command: 'result', code: code });
                    } catch (error) {
                        panel.webview.postMessage({ command: 'result', code: 'Failed to generate code.' });
                    }
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent() {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            body {
                font-family: 'Segoe UI', sans-serif;
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
                background: #f9f9f9;
            }

            .message {
                max-width: 70%;
                padding: 10px;
                border-radius: 10px;
                white-space: pre-wrap;
                word-wrap: break-word;
                color: black;
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
                loadingMsg.id = "loading";
                vscode.postMessage({ command: 'generate', text: text });

                                
            }

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'result') {
                    const oldMsg = document.getElementById('loading');
                    if (oldMsg) {
                        oldMsg.textContent = message.code;
                        oldMsg.removeAttribute('id');
                    } else {
                        addMessage(message.code, 'bot');
                    }
                }
            });

        </script>
    </body>
    </html>
    `;
}