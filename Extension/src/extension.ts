import * as vscode from 'vscode';
import axios from 'axios';
import { getWebviewContent } from './webviewContent';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('codegenie.generateSnippet', () => {
        const panel = vscode.window.createWebviewPanel(
            'codegeniePanel',
            'CodeGenie ✨',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        const logoUri = panel.webview.asWebviewUri(
            vscode.Uri.joinPath(context.extensionUri, 'media', 'logo.png')
        );

        panel.webview.html = getWebviewContent(logoUri.toString());

        panel.webview.onDidReceiveMessage(
            async message => {
                if (message.command === 'generate') {
                    try {
                        const response = await axios.post('http://localhost:5000/generate-snippet', {
                            context: message.text,
                            language: 'python'
                        });
                        panel.webview.postMessage({ command: 'result', code: response.data.code });
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
