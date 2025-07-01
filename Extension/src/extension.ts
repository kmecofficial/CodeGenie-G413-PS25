import * as vscode from 'vscode';
import axios from 'axios';
import { getWebviewContent } from './webviewContent';
import * as path from 'path';


export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('codegenie.generateSnippet', () => {
        const panel = vscode.window.createWebviewPanel(
            'codegeniePanel',
            'CodeGenie',
            vscode.ViewColumn.Beside,
            { enableScripts: true }
        );

        const logoPath = vscode.Uri.file(
            path.join(context.extensionPath, 'media', 'logo.png')
        );
        const logoUri = panel.webview.asWebviewUri(logoPath);


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

    let inlineDisposable = vscode.commands.registerCommand('codegenie.inlineGenerate', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found.');
            return;
        }

        const selection = editor.selection;
        const selectedText = editor.document.getText(selection).trim();

        if (!selectedText) {
            vscode.window.showWarningMessage('Please select a comment line to generate code.');
            return;
        }

        try {
            const response = await axios.post('http://localhost:5000/generate-snippet', {
                context: selectedText,
                language: 'python'
            });

            const generatedCode = response.data.code;

            // Insert generated code below the selected line
            const insertPosition = selection.end.with(selection.end.line + 1, 0);
            editor.edit(editBuilder => {
                editBuilder.insert(insertPosition, generatedCode + '\n');
            });

        } catch (error) {
            vscode.window.showErrorMessage('Code generation failed.');
            console.error(error);
        }
    });

    context.subscriptions.push(inlineDisposable);

}
