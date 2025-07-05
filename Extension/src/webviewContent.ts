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

                btn.style.alignSelf = 'flex-end';
                btn.style.marginTop = '6px';

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
                    oldMsg.textContent = '';

                    const wrapper = document.createElement('div');
                    wrapper.style.display = 'flex';
                    wrapper.style.flexDirection = 'column';
                    wrapper.style.alignItems = 'flex-end';
                    wrapper.style.gap = '5px';

                    const codeBlock = document.createElement('pre');
                    codeBlock.textContent = message.code;
                    codeBlock.style.whiteSpace = 'pre-wrap';
                    codeBlock.style.margin = '0';
                    codeBlock.style.alignSelf = 'stretch'; // make code full width

                    const copyBtn = createCopyButton(message.code);

                    wrapper.appendChild(codeBlock);
                    wrapper.appendChild(copyBtn);
                    oldMsg.appendChild(wrapper);
                    oldMsg.removeAttribute('id');

                } else {
                    const msg = addMessage('', 'bot');

                    const wrapper = document.createElement('div');
                    wrapper.style.display = 'flex';
                    wrapper.style.flexDirection = 'column';
                    wrapper.style.alignItems = 'flex-end';
                    wrapper.style.gap = '5px';

                    const codeBlock = document.createElement('pre');
                    codeBlock.textContent = message.code;
                    codeBlock.style.whiteSpace = 'pre-wrap';
                    codeBlock.style.margin = '0';
                    codeBlock.style.alignSelf = 'stretch';

                    const copyBtn = createCopyButton(message.code);

                    wrapper.appendChild(codeBlock);
                    wrapper.appendChild(copyBtn);
                    msg.appendChild(wrapper);

                }
            }
        });

        </script>
    </body>
    </html>
    `;
}

export function getWebviewContentCodeSuggestion(prompt: string, solutions: string[]): string {
    let solutionHTML = "";

    solutions.forEach((solution, idx) => {
        
        const lines = solution.split('\n');
        const header = lines[0]; 
        const body = lines.slice(1).join('\n').trim(); 
        if (body) {
            const formattedBody = body
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;");

            solutionHTML += `
                <details>
                    <summary><strong>${header}</strong></summary>
                    <pre><code id="code-${idx}">${formattedBody}</code></pre>
                    <button onclick="copyCode(${idx})">Copy</button>
                    <button onclick="insertCode(${idx})">Insert</button>
                    <button onclick="deleteCode()">Delete</button>
                    <br/><br/>
                </details>
            `;
        }
    });

    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CodeGenie Results</title>
            <style>
                body {
                    background-color: var(--vscode-editor-background);
                    color: var(--vscode-editor-foreground);
                    font-family: var(--vscode-font-family);
                    padding: 1em;
                }
                pre {
                    background: var(--vscode-editorGroupHeader-tabsBorder);
                    padding: 1em;
                    border-radius: 4px;
                    overflow-x: auto;
                    color: var(--vscode-editor-foreground);
                }
                button {
                    margin: 0.5em 0.5em 0 0;
                    padding: 4px 10px;
                    font-size: 0.9em;
                    cursor: pointer;
                    background-color: var(--vscode-button-background);
                    color: var(--vscode-button-foreground);
                    border: none;
                    border-radius: 3px;
                }
                button:hover {
                    background-color: var(--vscode-button-hoverBackground);
                }
                h2, h3 {
                    color: var(--vscode-editor-foreground);
                }
                blockquote {
                    background: var(--vscode-editorGroupHeader-border);
                    border-left: 5px solid var(--vscode-charts-green);
                    margin: 1.5em 10px;
                    padding: 0.5em 10px;
                }
                details {
                    margin-bottom: 1em;
                    border: 1px solid var(--vscode-editorGroup-border);
                    border-radius: 4px;
                    padding: 0.5em;
                }
                summary {
                    cursor: pointer;
                    font-weight: bold;
                    padding: 0.2em 0;
                }
            </style>
        </head>
        <body>
            <h2>Generated Code Approaches</h2>
            <section>
                <h3>Prompt:</h3>
                <blockquote>${prompt}</blockquote>
                ${solutionHTML}
            </section>
            <script>
                const vscode = acquireVsCodeApi();

                function copyCode(solIdx) {
                    const codeBlock = document.getElementById('code-' + solIdx);
                    if (codeBlock) {
                        const textArea = document.createElement("textarea");
                        textArea.value = codeBlock.innerText;
                        document.body.appendChild(textArea);
                        textArea.select();
                        try {
                            document.execCommand('copy');
                            console.log('Code copied!');
                        } catch (err) {
                            console.error('Failed to copy code: ' + err);
                        }
                        document.body.removeChild(textArea);
                    }
                }

                function insertCode(solIdx) {
                    const codeBlock = document.getElementById('code-' + solIdx);
                    if (codeBlock) {
                        vscode.postMessage({
                            command: 'insertCode',
                            code: codeBlock.innerText
                        });
                    }
                }

                function deleteCode() {
                    vscode.postMessage({
                        command: 'deleteInsertedCode'
                    });
                }
            </script>
        </body>
        </html>
    `;
}
