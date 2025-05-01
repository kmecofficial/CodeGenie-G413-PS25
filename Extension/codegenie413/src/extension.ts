import * as vscode from 'vscode';
import axios from 'axios';

const API_URL = 'http://localhost:5000/generate';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGenie activated!');

    let disposable = vscode.commands.registerCommand('codegenie.generate', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor!');
            return;
        }

        const prompt = await vscode.window.showInputBox({
            prompt: 'Enter your coding prompt',
            placeHolder: 'e.g. "Python function to calculate factorial"'
        });

        if (!prompt) return;

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "CodeGenie: Generating code...",
                cancellable: true
            }, async (progress, token) => {
                token.onCancellationRequested(() => {
                    console.log("User canceled generation");
                });

                progress.report({ message: "Connecting to AI server..." });

                try {
                    const response = await axios.post(API_URL, {
                        prompt: prompt,
                        max_length: 500
                    });

                    if (response.data.status !== 'success') {
                        throw new Error(response.data.error || 'API request failed');
                    }

                    const generatedCode = response.data.generated_text;
                    await editor.edit(editBuilder => {
                        editBuilder.insert(editor.selection.active, generatedCode + '\n');
                    });

                    vscode.window.showInformationMessage('Code generated successfully!');
                } catch (error) {
                    throw error;
                }
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(`Error: ${error.message}`);
            console.error('Generation Error:', error);
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
