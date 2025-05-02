"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
const vscode = __importStar(require("vscode"));
const axios_1 = __importDefault(require("axios"));
function activate(context) {
    let disposable = vscode.commands.registerCommand('codegenie.generateSnippet', () => {
        const panel = vscode.window.createWebviewPanel('codegeniePanel', 'CodeGenie ✨', vscode.ViewColumn.Beside, {
            enableScripts: true
        });
        panel.webview.html = getWebviewContent();
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'generate') {
                try {
                    const response = await axios_1.default.post('http://localhost:5000/generate-snippet', {
                        context: message.text,
                        language: 'python'
                    });
                    const code = response.data.code;
                    panel.webview.postMessage({ command: 'result', code: code });
                }
                catch (error) {
                    panel.webview.postMessage({ command: 'result', code: 'Failed to generate code.' });
                }
            }
        }, undefined, context.subscriptions);
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
//# sourceMappingURL=extension.js.map