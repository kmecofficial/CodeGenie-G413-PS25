export function getWebviewContent(logoSrc: string): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            :root {
                --bg: #1e1e1e;
                --fg: #d4d4d4;
                --user-bg: #264f78;
                --bot-bg: #333333;
            }

            .light-theme {
                --bg: #ffffff;
                --fg: #000000;
                --user-bg: #007acc;
                --bot-bg: #e6e6e6;
            }

            .dark-theme {
                --bg: #1e1e1e;
                --fg: #d4d4d4;
                --user-bg: #264f78;
                --bot-bg: #333333;
            }

            body {
                font-family: 'Fira Sans','Segoe UI', sans-serif;
                font-size: 14px;
                margin: 0;
                padding: 0;
                display: flex;
                flex-direction: column;
                height: 100vh;
                color: var(--fg);
                background-color: var(--bg);
                transition: background-color 0.3s ease, color 0.3s ease;
            }

            #themeToggle {
                position: absolute;
                top: 10px;
                left: 10px;
                font-size: 16px;
                padding: 6px 12px;
                border-radius: 5px;
                background-color: var(--bot-bg);
                color: var(--fg);
                border: none;
                cursor: pointer;
            }

            #welcome {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                padding: 2rem;
            }

            #chat {
                flex: 1;
                padding: 20px;
                overflow-y: auto;
                display: none;
                flex-direction: column;
                gap: 10px;
                background: var(--bg);
            }

            .message {
                max-width: 70%;
                padding: 10px;
                border-radius: 10px;
                white-space: pre-wrap;
                word-wrap: break-word;
                color: var(--fg);
                position: relative;
            }

            .user {
                align-self: flex-end;
                background-color: var(--user-bg);
                border-top-right-radius: 0;
                color: white;
            }

            .bot {
                align-self: flex-start;
                background-color: var(--bot-bg);
                border-top-left-radius: 0;
            }

            #inputBar {
                display: flex;
                padding: 10px;
                background-color: var(--bg);
                border-top: 1px solid #555;
            }

            textarea {
                flex: 1;
                resize: none;
                height: 50px;
                padding: 10px;
                border-radius: 8px;
                font-size: 14px;
                border: 1px solid #999;
                margin-right: 10px;
                color: var(--fg);
                background-color: var(--bg);
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
                border: 3px solid #888;
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
        <button id="themeToggle">🌙</button>
        <div id="welcome">
            <h1>👋 Welcome to CodeGenie</h1>
            <p>Start by entering a prompt below and pressing "Generate"</p>
        </div>

        <div id="chat"></div>

        <div id="inputBar">
            <textarea id="input" placeholder="Type your prompt..."></textarea>
            <button onclick="send()">➤</button>
        </div>

        <script>
            const vscode = acquireVsCodeApi();

            // Load stored theme or default to dark
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

                document.getElementById('welcome').style.display = 'none';
                document.getElementById('chat').style.display = 'flex';

                addMessage(text, 'user');
                input.value = '';

                const loadingMsg = addMessage("Generating response", 'bot');
                const dots = document.createElement('span');
                dots.id = 'dots';
                dots.style.display = 'inline-block';
                dots.style.fontFamily = 'monospace';
                dots.style.minWidth = '3ch'; 
                dots.textContent = '    ';

                loadingMsg.appendChild(dots);
                loadingMsg.id = "loading";

                let dotCount = 0;
                const maxDots = 3;
                const totalSlots = 4;
                const dotInterval = setInterval(() => {
                    dotCount = (dotCount + 1) % (maxDots + 1);
                    dots.textContent = ' ' + ' .'.repeat(dotCount);
                    const visibleDots = '.'.repeat(dotCount);
                    const remaining = '\u00A0'.repeat(totalSlots - dotCount);
                    dots.textContent = visibleDots + remaining;
                }, 1000);

                loadingMsg.setAttribute('data-interval-id', dotInterval.toString());

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
                        const intervalId = parseInt(oldMsg.getAttribute('data-interval-id') || '', 10);
                        if (!isNaN(intervalId)) clearInterval(intervalId);
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
                        codeBlock.style.alignSelf = 'stretch';

                        const copyBtn = createCopyButton(message.code);

                        wrapper.appendChild(codeBlock);
                        const hr = document.createElement('hr');
                        hr.style.border = 'none';
                        hr.style.borderTop = '1px solid #ccc';
                        hr.style.width = '100%';
                        wrapper.appendChild(hr);
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
                        const hr = document.createElement('hr');
                        hr.style.border = 'none';
                        hr.style.borderTop = '1px solid #ccc';
                        hr.style.width = '100%';
                        wrapper.appendChild(hr);
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

interface BackendResponse {
    completed_code?: string;
    explanation?: string;
    example?: string;
    error?: string;
    debug_explanation?: string;
}


export function getWebviewContentAutoCompletion(data: BackendResponse): string {
    const { completed_code, explanation, example, debug_explanation } = data;
    const nonce = new Date().getTime().toString();

    const sanitize = (text: string | undefined) => {
        if (!text) return '';
        return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    };
    const isErrorPresent = debug_explanation && 
                           !debug_explanation.toLowerCase().includes('no errors found') && 
                           !debug_explanation.toLowerCase().includes('code is incomplete') &&
                           !debug_explanation.toLowerCase().includes('complete');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 10px
        }
        h2 {
            color: var(--vscode-textLink-foreground);
            margin-top: 24px;
            border-bottom: 1px solid var(--vscode-editorWidget-border);
            padding-bottom: 4px
        }
        pre {
            background-color: var(--vscode-editorWidget-background);
            padding: 12px;
            border-radius: 5px;
            border: 1px solid var(--vscode-editorWidget-border);
            white-space: pre-wrap;
            word-wrap: break-word
        }
        .key {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 3px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            font-family: var(--vscode-font-family)
        }
        .debug-box {
            border-left-width: 5px;
            border-left-style: solid;
            padding: 15px;
            margin: 15px 0;
            border-radius: 5px
        }
        .debug-box.error {
            background-color: rgba(217, 83, 79, .1);
            border-left-color: #d9534f
        }
        .debug-box.no-error {
            background-color: rgba(92, 184, 92, .1);
            border-left-color: #5cb85c
        }
        .footer-message {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background-color: var(--vscode-statusBar-background);
            color: var(--vscode-statusBar-foreground);
            padding: 10px;
            text-align: center;
            font-weight: bold
        }
        .about-button {
            position: absolute;
            top: 20px;
            right: 25px;
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-button-border);
            border-radius: 5px;
            padding: 5px 10px;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            user-select: none;
            transition: background-color .2s ease
        }
        .about-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground)
        }
        .about-button .about-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 1.5px solid var(--vscode-button-secondaryForeground);
            font-weight: bold;
            font-style: italic;
            font-size: 12px
        }
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, .6);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 1000
        }
        .modal-content {
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 25px;
            border-radius: 8px;
            width: 90%;
            max-width: 650px;
            border: 1px solid var(--vscode-editorWidget-border);
            box-shadow: 0 5px 15px rgba(0, 0, 0, .3);
            position: relative;
            max-height: 80vh;
            overflow-y: auto
        }
        .modal-close {
            position: absolute;
            top: 10px;
            right: 15px;
            font-size: 22px;
            font-weight: bold;
            cursor: pointer;
            color: var(--vscode-editor-foreground)
        }
    </style>
</head>
<body>
    <button class="about-button" id="aboutButton" title="About CodeGenie">
        <span>ℹ️</span><span> About</span>
    </button>
    <h1>🧞 CodeGenie Result</h1>
    <h2>🐞 Debug Analysis</h2>
    <div class="debug-box ${isErrorPresent ? 'error' : 'no-error'}">
        <p>${sanitize(debug_explanation) || 'No debug analysis was provided.'}</p>
    </div>
    <h2>✅ Autocompleted Code</h2>
    <pre><code>${sanitize(completed_code)}</code></pre>
    <h2>💡 Explanation</h2>
    <p>${sanitize(explanation)}</p>
    <h2>🚀 Example</h2>
    <pre><code>${sanitize(example)}</code></pre>
    <div id="aboutModal" class="modal-overlay">
        <div class="modal-content">
            <span id="closeModal" class="modal-close" title="Close">&times;</span>
            <h2>ℹ️ About CodeGenie Autocompletion</h2>
            <p><b>CodeGenie</b> is an intelligent coding assistant that leverages the power of AI to help you write, complete, debug, and understand code more efficiently.</p>
            <h3>🔮 Key Features:</h3>
            <ul>
                <li>⚡ <b>Inline Autocompletion:</b> Press Inline Autocomplete button or <span class="key">Alt+I</span> (or <span class="key">Cmd+I</span> on Mac) for quick, direct code generation. This command replaces your entire file with the completed code, perfect for fast-paced development.</li>
                <li>✨ <b>Debug & Autocompletion:</b> Press Debug & Autocomplete button or <span class="key">Alt+P</span> (or <span class="key">Cmd+P</span> on Mac) to trigger a comprehensive analysis of your file. Results are shown in this panel, including error analysis, completed code, explanations, and examples. If your code has issues, CodeGenie identifies the errors, explains why they are problems, and provides a corrected version. Understand the generated code with clear descriptions of its functionality and practical usage examples.</li>
            </ul>
            <h3>🧠 How It Works</h3>
            <p>CodeGenie sends your file’s content to its intelligent backend. Based on deep understanding, it returns a structured response containing:</p>
            <ul>
                <li>🐞 <b>Debug Analysis:</b> A check for any syntactical errors.</li>
                <li>✅ <b>Autocompleted Code:</b> A polished, ready-to-use version of your snippet.</li>
                <li>💡 <b>Explanation:</b> What the code does and why.</li>
                <li>🚀 <b>Example:</b> A mini-demo or sample run.</li>
            </ul>
            <h3>📌 Best Practices:</h3>
            <ul>
                <li>Write meaningful partial code or comments—the more context you provide, the better the results.</li>
                <li>Use Inline Autocomplete⚡or Debug & Autocomplete✨ buttons in the top-right of your editor to access Codegenie Autocompletion.</li>
                <li>Use <span class="key">Alt+I</span> for fast, in-place code generation.</li>
                <li>Use <span class="key">Alt+P</span> for a detailed review or when you suspect errors.</li>
                <li>Review and adapt the generated code—treat CodeGenie as a smart partner, not a replacement.</li>
            </ul>
            <h3>🔗 Source Code</h3>
            <p>CodeGenie is open source! You can find the repository on GitHub: <a href="https://github.com/kmecofficial/CodeGenie-G413-PS25">https://github.com/kmecofficial/CodeGenie-G413-PS25</a></p>
            <p>Let CodeGenie be your coding companion — always ready to turn your ideas into working code. 🧞</p>
        </div>
    </div>
    <div class="footer-message">Press <span class="key">Enter</span> to insert code, or <span class="key">Backspace</span> to cancel.</div>
    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        window.addEventListener("keydown", e => {
            e.key === "Enter" && vscode.postMessage({
                command: "insert"
            }), e.key === "Backspace" && vscode.postMessage({
                command: "revert"
            })
        });
        const aboutModal = document.getElementById("aboutModal"),
            aboutButton = document.getElementById("aboutButton"),
            closeModal = document.getElementById("closeModal");
        aboutButton.addEventListener("click", () => {
            aboutModal.style.display = "flex"
        }), closeModal.addEventListener("click", () => {
            aboutModal.style.display = "none"
        }), aboutModal.addEventListener("click", e => {
            e.target === aboutModal && (aboutModal.style.display = "none")
        });
    </script>
</body>
</html>`;
}