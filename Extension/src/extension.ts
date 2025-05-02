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
                margin: 20px;
            }
            textarea {
                width: 100%;
                height: 100px;
                font-size: 14px;
                padding: 8px;
            }
            button {
                margin-top: 10px;
                padding: 8px 16px;
                font-size: 14px;
                background-color: #007acc;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            pre {
                margin-top: 20px;
                background-color: #f3f3f3;
                color:black;
                padding: 10px;
                border-radius: 4px;
                overflow-x: auto;
            }
        </style>
    </head>
    <body>
        <h2>Ask CodeGenie ✨</h2>
        <textarea id="input" placeholder="Describe the code you want..."></textarea><br/>
        <button onclick="generate()">Generate</button>
        <pre id="result"></pre>

        <script>
            const vscode = acquireVsCodeApi();
            function generate() {
                const text = document.getElementById('input').value;
                vscode.postMessage({ command: 'generate', text: text });
            }

            window.addEventListener('message', event => {
                const message = event.data;
                if (message.command === 'result') {
                    document.getElementById('result').textContent = message.code;
                }
            });
        </script>
    </body>
    </html>
    `;
}
