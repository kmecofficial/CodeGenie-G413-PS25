import * as vscode from 'vscode';
import axios,{AxiosError} from 'axios';
import { getaboutviewContent, getChatbotWebviewContent} from './webviewContent';
import * as path from 'path';
import { BACKEND_URLS }  from './urlconstants';

interface InlineSuggestionState {
    solutions: string[];
    originalRange: vscode.Range;
    originalContent: string;
    lastInsertionRange: vscode.Range | null;
    currentBlockRange: vscode.Range | null;
    languageId: string;
    activeSolutionIndex: number | null;
}

let activeInlineState: InlineSuggestionState | null = null;
let panel: vscode.WebviewPanel | undefined;
let chatbotPanel: vscode.WebviewPanel | undefined;
let panelOriginalPromptRange: vscode.Range | null = null;
let panelOriginalPromptContent: string | null = null;
let lastActivePanelInsertionRange: vscode.Range | null = null;
let currentPanelSolutions: string[] = [];
let webviewPanel: vscode.WebviewPanel | undefined;
let typingHintDecoration: vscode.TextEditorDecorationType;
let watermarkDecoration: vscode.TextEditorDecorationType;
let isHintSuppressed = false;

interface BackendResponse {
    completed_code?: string;
    explanation?: string;
    example?: string;
    error?: string;
    debug_explanation?: string;
    code?: string;
    response?: string;
}

const insertedCodeRanges = new Map<string, vscode.Range>();
const languageMap: { [key: string]: { name: string, singleLineComment: string, blockCommentStart?: string, blockCommentEnd?: string } } = {
    python: { name: 'Python', singleLineComment: '#' },
    java: { name: 'Java', singleLineComment: '//' },
    cpp: { name: 'C++', singleLineComment: '//' },
    javascript: { name: 'JavaScript', singleLineComment: '//' },
    c: { name: 'C', singleLineComment: '//' },
    php: { name: 'PHP', singleLineComment: '//' },
    typescript: { name: 'TypeScript', singleLineComment: '//' },
    go: { name: 'Go', singleLineComment: '//' },
    rust: { name: 'Rust', singleLineComment: '//' },
    swift: { name: 'Swift', singleLineComment: '//' },
    ruby: { name: 'Ruby', singleLineComment: '#' },
    kotlin: { name: 'Kotlin', singleLineComment: '//' },
    csharp: { name: 'C#', singleLineComment: '//' },
    html: { name: 'HTML', singleLineComment: '', blockCommentStart: '' },
    xml: { name: 'XML', singleLineComment: '', blockCommentStart: '' },
    css: { name: 'CSS', singleLineComment: '/*', blockCommentStart: '/*', blockCommentEnd: '*/' },
    json: { name: 'JSON', singleLineComment: '//' }};

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGenie is now active!🧞');
    const inlineAutocompleteCommand = vscode.commands.registerCommand('codegenie.inlineAutocomplete', runInlineAutocomplete);
    context.subscriptions.push(inlineAutocompleteCommand);
    context.subscriptions.push(
            vscode.commands.registerCommand('codegenie.InlineSuggestions', async () => {
                handleSuggestion(context, 'inline');
            }));
        for (let i = 1; i <= 9; i++) {
            context.subscriptions.push(
                vscode.commands.registerCommand(`codegenie.inline.insertSolution${i}`, () => toggleInlineSolution(i, 'insert')),
                vscode.commands.registerCommand(`codegenie.inline.deleteSolution${i}`, () => toggleInlineSolution(i, 'delete'))
            );}
        context.subscriptions.push(
            vscode.commands.registerCommand('codegenie.inline.revertPrompt', async () => {
                await revertToOriginalPrompt();
            }));
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
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Generating Inline Snippet...💡',
                cancellable: true,
            },
            async () => {
                try {
                    const response = await axios.post(BACKEND_URLS.INTELLIGENT_SNIPPETS, {
                        context: selectedText,
                        language: 'python'
                    });
                    const generatedCode = response.data.code;
                    const insertPosition = selection.end.with(selection.end.line + 1, 0);
                    editor.edit(editBuilder => {
                        editBuilder.insert(insertPosition, generatedCode + '\n');
                    });
                } catch (error) {
                    vscode.window.showErrorMessage('Code generation failed.');
                    console.error(error);
                }});});
    context.subscriptions.push(inlineDisposable);
    const autocompleteCommand = vscode.commands.registerCommand('codegenie.autocomplete', () => {
        const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            if (!chatbotPanel)
                {
                    vscode.commands.executeCommand('codegenie.chatbotPanel');
                }
                if (chatbotPanel)
                    {
                        chatbotPanel.reveal(column);
                        chatbotPanel.webview.postMessage(
                            {
                            command: 'setChatbotMode',
                            mode: 'Auto Completion',
                            outputTypes: 'Panel Mode'
                        });}});
    context.subscriptions.push(autocompleteCommand);
    context.subscriptions.push(
            vscode.commands.registerCommand('codegenie.PanelSuggestions', async () => {
                const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            if (!chatbotPanel)
                {
                    vscode.commands.executeCommand('codegenie.chatbotPanel');
                }
                if (chatbotPanel)
                    {
                        chatbotPanel.reveal(column);
                        chatbotPanel.webview.postMessage(
                            {
                            command: 'setChatbotMode',
                            mode: 'Code Suggestion',
                            outputTypes: 'Panel Mode'
                        });}}));
    let disposable = vscode.commands.registerCommand('codegenie.generateSnippet', () => {
        const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            if (!chatbotPanel)
                {
                    vscode.commands.executeCommand('codegenie.chatbotPanel');
                }
                if (chatbotPanel)
                    {
                        chatbotPanel.reveal(column);
                        chatbotPanel.webview.postMessage(
                            {
                            command: 'setChatbotMode',
                            mode: 'Intelligent Snippet',
                            outputTypes: 'Panel Mode'
                        });}});
    context.subscriptions.push(disposable);
    context.subscriptions.push(
        vscode.commands.registerCommand('codegenie.showAutocompleteModes', async () => {
            const pick = await vscode.window.showQuickPick(
                ['Inline Mode','Panel Mode',],
                {
                    placeHolder: 'Select how to Auto Complete',
                    canPickMany: false
                }
            );
            if (pick === 'Panel Mode') {
                const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            if (!chatbotPanel)
                {
                    vscode.commands.executeCommand('codegenie.chatbotPanel');
                }
                if (chatbotPanel)
                    {
                        chatbotPanel.reveal(column);
                        chatbotPanel.webview.postMessage(
                            {
                            command: 'setChatbotMode',
                            mode: 'Auto Completion',
                            outputTypes: 'Panel Mode'
                        });
                    }
            } else if (pick === 'Inline Mode') {
                runInlineAutocomplete(context, 'inline');
            }
        })
    );
     context.subscriptions.push(
        vscode.commands.registerCommand('codegenie.showAboutPage', () => {
            const aboutPanel = vscode.window.createWebviewPanel(
                'codegenieAbout',
                'About CodeGenie',
                vscode.ViewColumn.Beside,
                { enableScripts: true }
            );
            aboutPanel.webview.html = getaboutviewContent();
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('codegenie.showIntelligentSnippetModes', async () => {
        const pick = await vscode.window.showQuickPick(
            ['Inline Mode','Panel Mode'],
            {
            placeHolder: 'Select how to get Snippets',
            canPickMany: false
            }
        );
        if (pick === 'Panel Mode')
            {
            const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            if (!chatbotPanel)
                {
                    vscode.commands.executeCommand('codegenie.chatbotPanel');
                }
                if (chatbotPanel)
                    {
                        chatbotPanel.reveal(column);
                        chatbotPanel.webview.postMessage(
                            {
                            command: 'setChatbotMode',
                            mode: 'Intelligent Snippet',
                            outputTypes: 'Panel Mode'
                        });
                    }
                    else
                        {
                            vscode.window.showErrorMessage('Failed to open CodeGenie Chatbot.');
                        }
                    }
        else if (pick === 'Inline Mode')
            {
             vscode.commands.executeCommand('codegenie.inlineGenerate');
        }
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('codegenie.showCodeSuggestionModes', async () => {
            const pick = await vscode.window.showQuickPick(
                ['Inline Mode','Panel Mode'],
                {
                    placeHolder: 'Select how to get code suggestions',
                    canPickMany: false
                }
            );
            if (pick === 'Panel Mode') {
                const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;
            if (!chatbotPanel)
                {
                    vscode.commands.executeCommand('codegenie.chatbotPanel');
                }
                if (chatbotPanel)
                    {
                        chatbotPanel.reveal(column);
                        chatbotPanel.webview.postMessage(
                            {
                            command: 'setChatbotMode',
                            mode: 'Code Suggestion',
                            outputTypes: 'Panel Mode'
                        });
                    }
            } else if (pick === 'Inline Mode') {
                handleSuggestion(context, 'inline');
            }
        })
    );
    typingHintDecoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        after: {
            contentText: 'Use the command buttons or shortcut keys as needed. See ℹ️ About for feature details.',
            color: '#00BFFF',
            fontWeight: 'bold',
            fontStyle: 'normal',
            margin: '0 0 0 1em'
        }
    });
    watermarkDecoration = vscode.window.createTextEditorDecorationType({
        isWholeLine: true,
        after: {
            contentText: 'Welcome to CodeGenie!🧞',
            color: '#00BFFF',
            fontWeight: 'bold',
            fontStyle: 'italic',
            margin: '0 0 0 1em',
        },
    });
    let activeEditor = vscode.window.activeTextEditor;
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            isHintSuppressed = false;
            updateDecorations(editor);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            if (isHintSuppressed) {
                isHintSuppressed = false;
            }
            updateDecorations(activeEditor);
        }
    }));
    context.subscriptions.push(vscode.window.onDidChangeTextEditorSelection(event => {
        if (event.textEditor) {
            updateDecorations(event.textEditor);
        }
    }));
    if (activeEditor) {
        updateDecorations(activeEditor);
    }
    const chatbotCommand = vscode.commands.registerCommand('codegenie.chatbotPanel', () => {
        const column = vscode.window.activeTextEditor ? vscode.ViewColumn.Beside : vscode.ViewColumn.One;

        if (chatbotPanel) {
            chatbotPanel.reveal(column);
            return;
        }
        chatbotPanel = vscode.window.createWebviewPanel(
            'codegenieChatbot',
            'CodeGenie Chatbot',
            column,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.file(path.join(context.extensionUri.fsPath, 'media'))]
            }
        );
        const darkLogoPath = vscode.Uri.file(path.join(context.extensionUri.fsPath, 'media', 'logo_dark.png'));
        const logoUri = chatbotPanel.webview.asWebviewUri(darkLogoPath);
        chatbotPanel.webview.html = getChatbotWebviewContent(logoUri.toString());

        chatbotPanel.onDidDispose(() => {
            chatbotPanel = undefined;
            insertedCodeRanges.clear();
        }, null, context.subscriptions);
        chatbotPanel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'callBackend': {
                    const editor = vscode.window.activeTextEditor;
                    let langName = 'python';
                    if (editor) {
                        langName = languageMap[editor.document.languageId]?.name || 'python';
                    }
                    let url = '';
                    let payload = {};
                    switch (message.mode) {
                        case 'Intelligent Snippet':
                            url = BACKEND_URLS.INTELLIGENT_SNIPPETS;
                            payload = { context: message.prompt, language: langName };
                            break;
                        case 'Code Suggestion':
                             url = BACKEND_URLS.CODE_SUGGESTION;
                             payload = { prompt: message.prompt, language: langName };
                             break;
                        case 'Auto Completion':
                            url = BACKEND_URLS.AUTO_COMPLETE;
                            payload = { prompt: message.prompt };
                            break;
                    }
                    try {
                        const { data } : { data: BackendResponse } = await axios.post(url, payload);
                        if (message.outputType === 'inline') {
                            const editor = vscode.window.activeTextEditor;
                            if (!editor) {
                                vscode.window.showErrorMessage('Please open a file and place your cursor to insert code.');
                                chatbotPanel?.webview.postMessage({ command: 'showError', message: 'No active file editor to insert code into.' });
                                return;
                            }
                            if (message.mode === 'Code Suggestion' && data.response) {
                                const generatedCode = data.response;
                                if (!generatedCode || typeof generatedCode !== 'string') {
                                    vscode.window.showErrorMessage('Unexpected response format from backend for Code Suggestion.');
                                    return;
                                }
                                const parts = generatedCode.split(/(Solution\s*\d+\s*:\s*(?:Using\s*(?:functions|recursion|iteration))?)/);
                                const solutions: string[] = [];
                                for (let i = 1; i < parts.length; i += 2) {
                                    const header = parts[i].trim();
                                    const body = (parts[i + 1] || '').trim();
                                    if (body) {
                                        solutions.push(header + '\n' + body);
                                    }
                                }
                                if (solutions.length === 0) {
                                    vscode.window.showErrorMessage('Could not parse any solutions from the response.');
                                    return;
                                }
                                const selection = editor.selection;
                                const originalText = editor.document.getText(selection);
                                await startInlineSuggestionSession(editor, solutions, selection, originalText);
                                chatbotPanel?.webview.postMessage({ command: 'codeInserted' });
                                return;
                            } else {
                                let codeToInsert = '';
                                if (message.mode === 'Intelligent Snippet' && data.code) {
                                    codeToInsert = data.code;
                                } else if (message.mode === 'Auto Completion' && data.completed_code) {
                                    codeToInsert = data.completed_code;
                                } else {
                                    codeToInsert = JSON.stringify(data, null, 2);
                                }
                                editor.edit(editBuilder => {
                                    editBuilder.insert(editor.selection.active, codeToInsert);
                                });
                                chatbotPanel?.webview.postMessage({ command: 'codeInserted' });
                            }}
                             else {
                            chatbotPanel?.webview.postMessage({
                                command: 'backendResponse',
                                data: data,
                                outputType: message.outputType,
                                mode: message.mode
                            });
                        }}
                         catch (error) {
                         const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                         chatbotPanel?.webview.postMessage({ command: 'showError', message: `Failed to get response: ${errorMsg}` });
                    }
                    break;
                }
                case 'insertCode': {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showErrorMessage('Please open and focus a file to insert code.');
                        return;
                    }
                    const { code, blockId } = message;
                    const selection = editor.selection;
                    await editor.edit(editBuilder => {
                       editBuilder.replace(selection, code);
                       const endPosition = new vscode.Position(
                           selection.start.line + code.split('\n').length - 1,
                           (selection.start.line === editor.selection.end.line ? selection.start.character : 0) + code.split('\n').pop()!.length
                       );
                       insertedCodeRanges.set(blockId, new vscode.Range(selection.start, endPosition));
                    });
                    break;
                }
                case 'deleteCode': {
                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        vscode.window.showErrorMessage('Please open and focus a file to delete code.');
                        return;
                    }
                     const rangeToDelete = insertedCodeRanges.get(message.blockId);
                     if (rangeToDelete) {
                         await editor.edit(editBuilder => {
                             editBuilder.delete(rangeToDelete);
                         });
                         insertedCodeRanges.delete(message.blockId);
                         vscode.window.showInformationMessage('Code deleted successfully.');
                     } else {
                         vscode.window.showInformationMessage('No inserted code to delete.');
                     }
                    break;
                }
            }
        });
    });
    context.subscriptions.push(chatbotCommand);
}

function updateDecorations(editor: vscode.TextEditor) {
    if (!editor || webviewPanel) {
        if (editor) {
            editor.setDecorations(typingHintDecoration, []);
            editor.setDecorations(watermarkDecoration, []);
        }
        return;
    }
    if (isHintSuppressed) {
        editor.setDecorations(typingHintDecoration, []);
        if (editor.document.getText().length === 0) {
            editor.setDecorations(watermarkDecoration, [new vscode.Range(0, 0, 0, 0)]);
        } else {
            editor.setDecorations(watermarkDecoration, []);
        }
        return;
    }
    const doc = editor.document;
    const hintDecorations: vscode.DecorationOptions[] = [];
    const watermarkDecorations: vscode.DecorationOptions[] = [];
    if (doc.getText().trim().length === 0) {
        watermarkDecorations.push({ range: new vscode.Range(0, 0, 0, 0) });
    } else {
        let lastNonEmptyLineNum = -1;
        for (let i = doc.lineCount - 1; i >= 0; i--) {
            if (!doc.lineAt(i).isEmptyOrWhitespace) {
                lastNonEmptyLineNum = i;
                break;
            }
        }
        const cursorLineNum = editor.selection.active.line;
        if (lastNonEmptyLineNum !== -1 && cursorLineNum === lastNonEmptyLineNum + 1) {
            const hintRange = new vscode.Range(cursorLineNum, 0, cursorLineNum, 0);
            hintDecorations.push({ range: hintRange });
        }
    }
    editor.setDecorations(typingHintDecoration, hintDecorations);
    editor.setDecorations(watermarkDecoration, watermarkDecorations);
}

async function runInlineAutocomplete(context: vscode.ExtensionContext, mode: 'inline' | 'panel') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('❌ No active editor window. Please open a file.');
        return;
    }
    const document = editor.document;
    const prompt = document.getText();
    if (!prompt.trim()) {
        vscode.window.showInformationMessage('❌ Cannot generate code from an empty file.');
        return;
    }
    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(document.getText().length)
    );
    await vscode.window.withProgress(
        { location: vscode.ProgressLocation.Notification, title: "Autocompleting Inline... ✨" , cancellable: true },
        async (progress, token) => {
            token.onCancellationRequested(() => {
                console.log("User cancelled the CodeGenie Inline Autocompletion.");
            });
            try {
                const response = await fetchFromBackend(prompt);
                console.log("Data received from backend for inline autocomplete:", JSON.stringify(response, null, 2));
                if (!response.completed_code || !response.completed_code.trim()) {
                    vscode.window.showWarningMessage('❌ CodeGenie did not return any code to insert.');
                    return;
                }
                await editor.edit(editBuilder => {
                    editBuilder.replace(fullRange, response.completed_code!);
                });
                await vscode.commands.executeCommand('editor.action.formatDocument');
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
                vscode.window.showErrorMessage(`❌ CodeGenie Error: ${errorMessage}`);
            }
        }
    );
}

async function fetchFromBackend(prompt: string): Promise<BackendResponse> {
    const url = BACKEND_URLS.AUTO_COMPLETE;
    try {
        const response = await axios.post<BackendResponse>(url, { prompt });
        if (response.data.error) {
            throw new Error(response.data.error);
        }
        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const axiosError = error as AxiosError<BackendResponse>;
            if (axiosError.code === 'ECONNREFUSED' || !axiosError.response) {
                throw new Error('Connection to backend failed. Is the Python server running?');
            }
            if (axiosError.response?.data?.error) {
                throw new Error(axiosError.response.data.error);
            }
        }
        throw error;
    }
}

async function handleSuggestion(context: vscode.ExtensionContext, mode: 'inline' | 'panel') {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor found.');
        return;
    }
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);
    if (!selectedText) {
        vscode.window.showInformationMessage('Please select a code snippet or problem description.');
        return;
    }
    const detectedLanguage = editor.document.languageId;
    const langConfig = languageMap[detectedLanguage];
    if (!langConfig) {
        vscode.window.showWarningMessage(
            `Unsupported language: '${detectedLanguage}'. CodeGenie currently supports: ` +
            Object.values(languageMap).map(l => l.name).filter((value, index, self) => self.indexOf(value) === index).join(', ') + '.'
        );
        return;
    }
    const savedEditor = editor;
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Generating Inline Code Suggestions... 🗎`,
        cancellable: true
    }, async () => {
        try {
            let generated;
            try {
                const response = await axios.post(BACKEND_URLS.CODE_SUGGESTION, {
                    prompt: selectedText,
                    language: langConfig.name
                });
                generated = response.data.response;
            } catch (error) {
                if (axios.isAxiosError(error) && error.response) {
                    vscode.window.showErrorMessage(
                        `Failed to generate code: ${error.response.status} - ${error.response.data?.error || error.response.statusText || 'Unknown error'}`
                    );
                } else {
                    vscode.window.showErrorMessage('Failed to generate code: ' + (error instanceof Error ? error.message : String(error)));
                }
                return;
            }
            if (!generated || typeof generated !== 'string') {
                throw new Error('Unexpected response format from backend.');
            }
            const parts = generated.split(/(Solution\s*\d+\s*:\s*(?:Using\s*(?:functions|recursion|iteration))?)/);
            const solutionsWithHeadersAndPrompt: string[] = [];
            for (let i = 1; i < parts.length; i += 2) {
                const header = parts[i].trim();
                const body = (parts[i + 1] || '').trim();
                if (body) {
                    solutionsWithHeadersAndPrompt.push(header + '\n' + body);
                }
            }
            if (mode === 'panel') {
                panelOriginalPromptRange = selection;
                panelOriginalPromptContent = selectedText;
                lastActivePanelInsertionRange = null;
                currentPanelSolutions = solutionsWithHeadersAndPrompt;
                if (panel) {
                    panel.reveal(vscode.ViewColumn.Beside);
                } else {
                    panel = vscode.window.createWebviewPanel(
                        'codegenieResults',
                        'CodeGenie - Multiple Approaches',
                        vscode.ViewColumn.Beside,
                        { enableScripts: true }
                    );
                    panel.onDidDispose(() => {
                        panel = undefined;
                        panelOriginalPromptRange = null;
                        panelOriginalPromptContent = null;
                        lastActivePanelInsertionRange = null;
                        currentPanelSolutions = [];
                    }, null, context.subscriptions);
                }
                panel.webview.onDidReceiveMessage(
                    async (message) => {
                        if (message.command === 'insertCode') {
                            const codeToInsert = message.code;
                            const editor = savedEditor;
                            if (!editor || !panelOriginalPromptRange || !panelOriginalPromptContent) {
                                vscode.window.showInformationMessage('Cannot insert code: Editor state not ready.');
                                return;
                            }
                            await editor.edit(editBuilder => {
                                let replaceRange: vscode.Range = lastActivePanelInsertionRange || panelOriginalPromptRange!;
                                editBuilder.replace(replaceRange, codeToInsert);
                                const newStart = replaceRange.start;
                                const lines = codeToInsert.split('\n');
                                const newEndLine = newStart.line + lines.length - 1;
                                const newEndChar = lines.length > 0 ? lines[lines.length - 1].length : 0;
                                lastActivePanelInsertionRange = new vscode.Range(newStart, new vscode.Position(newEndLine, newEndChar));
                                vscode.window.showInformationMessage('Code inserted (Panel mode).');
                            });
                        } else if (message.command === 'deleteInsertedCode') {
                            const editor = savedEditor;
                            if (!editor || !panelOriginalPromptRange || !panelOriginalPromptContent) {
                                vscode.window.showInformationMessage('Cannot delete code: Editor state not ready or no original prompt.');
                                return;
                            }
                            await editor.edit(editBuilder => {
                                let rangeToClear: vscode.Range | null = lastActivePanelInsertionRange || panelOriginalPromptRange;
                                if (rangeToClear) {
                                    editBuilder.replace(rangeToClear, panelOriginalPromptContent!);
                                }
                            });
                            lastActivePanelInsertionRange = null;
                            vscode.window.showInformationMessage('Reverted to original prompt (Panel mode).');
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            }
            if (mode === 'inline') {
                await startInlineSuggestionSession(savedEditor, solutionsWithHeadersAndPrompt, selection, selectedText);
            }
        } catch (error) {
            console.error("Error in handleSuggestion:", error);
            vscode.window.showErrorMessage('Error generating code: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}

async function startInlineSuggestionSession(editor: vscode.TextEditor, solutions: string[], selection: vscode.Range, originalText: string) {
    const detectedLanguage = editor.document.languageId;
    const langConfig = languageMap[detectedLanguage];
    activeInlineState = {
        solutions: solutions,
        originalRange: selection,
        originalContent: originalText,
        lastInsertionRange: null,
        currentBlockRange: null, 
        languageId: detectedLanguage,
        activeSolutionIndex: null 
    };
    let summaryContent = '';
    let commentPrefix = langConfig?.singleLineComment;
    let blockCommentStart = langConfig?.blockCommentStart;
    let blockCommentEnd = langConfig?.blockCommentEnd;
    if (blockCommentStart && blockCommentEnd && (detectedLanguage === 'html' || detectedLanguage === 'xml' || detectedLanguage === 'css')) {
        summaryContent += `${blockCommentStart} CodeGenie Solutions for: ${originalText.split('\n')[0]} ${blockCommentEnd}\n\n`;
    } else if (commentPrefix) {
        summaryContent += `${commentPrefix} CodeGenie Solutions for: ${originalText.split('\n')[0]}\n\n`;
    } else {
        summaryContent += `CodeGenie Solutions for: ${originalText.split('\n')[0]}\n\n`;
    }
    solutions.forEach((sol) => {
        summaryContent += `${sol}\n\n`;
    });
    if (blockCommentStart && blockCommentEnd && (detectedLanguage === 'html' || detectedLanguage === 'xml' || detectedLanguage === 'css')) {
        summaryContent += `${blockCommentStart} Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear. ${blockCommentEnd}`;
    } else if (commentPrefix) {
        summaryContent += `${commentPrefix} Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear.`;
    } else {
        summaryContent += `Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear.`;
    }
    await editor.edit(editBuilder => {
        editBuilder.replace(selection, summaryContent);
    });
    const newEndLine = selection.start.line + summaryContent.split('\n').length - 1;
    const newEndChar = summaryContent.split('\n').slice(-1)[0].length;
    if (activeInlineState) {
        activeInlineState.currentBlockRange = new vscode.Range(selection.start, new vscode.Position(newEndLine, newEndChar));
    }
    await vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionsActive', true);
    await vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionState', 'list');
    vscode.window.showInformationMessage(
        `CodeGenie: ${solutions.length} solutions generated. Select 1, 2, or 3 to insert, Ctrl+1/2/3 to revert to options, Esc to clear.`
    );
}

async function toggleInlineSolution(index: number, action: 'insert' | 'delete') {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !activeInlineState) {
        vscode.window.showInformationMessage('No active editor or inline session to modify.');
        return;
    }
    const langConfig = languageMap[activeInlineState.languageId];
    if (!langConfig) {
        vscode.window.showWarningMessage(`Unsupported language: '${activeInlineState.languageId}'.`);
        return;
    }
    try {
        await editor.edit(editBuilder => {
            if (action === 'insert') {
                const replaceRange = activeInlineState!.lastInsertionRange || activeInlineState!.currentBlockRange;
                if (!replaceRange) return;
                let targetSolutionContent = activeInlineState!.solutions[index - 1];
                if (!targetSolutionContent) {
                    vscode.window.showInformationMessage(`Solution ${index} not found.`);
                    return;
                }
                const lines = targetSolutionContent.split('\n');
                if (lines.length > 0 && lines[0].startsWith('Solution ')) {
                    targetSolutionContent = lines.slice(1).join('\n');
                }
                editBuilder.replace(replaceRange, targetSolutionContent);
                const newStart = replaceRange.start;
                const linesAfterInsert = targetSolutionContent.split('\n');
                const newEndLine = newStart.line + linesAfterInsert.length - 1;
                const newEndChar = linesAfterInsert.length > 0 ? linesAfterInsert[linesAfterInsert.length - 1].length : 0;
                activeInlineState!.lastInsertionRange = new vscode.Range(newStart, new vscode.Position(newEndLine, newEndChar));
                activeInlineState!.currentBlockRange = null;
                activeInlineState!.activeSolutionIndex = index;
            } else { 
                if (!activeInlineState!.lastInsertionRange || activeInlineState!.activeSolutionIndex !== index) {
                    return;
                }
                let summaryContent = '';
                const originalContent = activeInlineState!.originalContent;
                let commentPrefix = langConfig.singleLineComment;
                if (originalContent) {
                        if (langConfig.blockCommentStart && langConfig.blockCommentEnd && (activeInlineState!.languageId === 'html' || activeInlineState!.languageId === 'xml' || activeInlineState!.languageId === 'css')) {
                            summaryContent += `${langConfig.blockCommentStart} CodeGenie Solutions for: ${originalContent.split('\n')[0]} ${langConfig.blockCommentEnd}\n\n`;
                        } else if (commentPrefix) {
                            summaryContent += `${commentPrefix} CodeGenie Solutions for: ${originalContent.split('\n')[0]}\n\n`;
                        } else {
                            summaryContent += `CodeGenie Solutions for: ${originalContent.split('\n')[0]}\n\n`;
                        }}
                    activeInlineState!.solutions.forEach((sol) => {
                        summaryContent += `${sol}\n\n`;
                    });
                    if (langConfig.blockCommentStart && langConfig.blockCommentEnd && (activeInlineState!.languageId === 'html' || activeInlineState!.languageId === 'xml' || activeInlineState!.languageId === 'css')) {
                        summaryContent += `${langConfig.blockCommentStart} Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear. ${langConfig.blockCommentEnd}`;
                    } else if (commentPrefix) {
                        summaryContent += `${commentPrefix} Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear.`;
                    } else {
                        summaryContent += `Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear.`;
                    }
                const replaceRange = activeInlineState!.lastInsertionRange;
                editBuilder.replace(replaceRange, summaryContent);
                const newStart = replaceRange.start;
                const lines = summaryContent.split('\n');
                const newEndLine = newStart.line + lines.length - 1;
                const newEndChar = lines.length > 0 ? lines[lines.length - 1].length : 0;
                activeInlineState!.currentBlockRange = new vscode.Range(newStart, new vscode.Position(newEndLine, newEndChar));
                activeInlineState!.lastInsertionRange = null;
                activeInlineState!.activeSolutionIndex = null;
            }
        });
        if (action === 'insert') {
            await vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionState', 'inserted');
            vscode.window.showInformationMessage(`Inserted Solution ${index}.`);
        } else if (action === 'delete') {
            await vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionState', 'list');
            vscode.window.showInformationMessage('Reverted to solution options.');
        }
    } catch (e) {
        console.error("Error during editor.edit in toggleInlineSolution:", e);
        vscode.window.showErrorMessage("Failed to toggle solution: " + (e instanceof Error ? e.message : String(e)));
    }
}

async function revertToOriginalPrompt() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !activeInlineState) {
        vscode.window.showInformationMessage('No active editor or original prompt to revert to.');
        return;
    }
    try {
        await editor.edit(editBuilder => {
            const rangeToClear: vscode.Range | null = activeInlineState!.lastInsertionRange || activeInlineState!.currentBlockRange || activeInlineState!.originalRange;
            if (rangeToClear) {
                editBuilder.replace(rangeToClear, activeInlineState!.originalContent);
            }
        });
        activeInlineState = null;
        await vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionsActive', false);
        await vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionState', '');
        vscode.window.showInformationMessage('Reverted to original prompt. All inline suggestions cleared.');
    } catch (e) {
        console.error("Error during editor.edit for revert:", e);
        vscode.window.showErrorMessage("Failed to revert to original prompt: " + (e instanceof Error ? e.message : String(e)));
        }
    }

export function deactivate() {
    console.log('CodeGenie extension deactivated.');
    activeInlineState = null;
    vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionsActive', false);
    vscode.commands.executeCommand('setContext', 'codegenie.inlineSuggestionState', '');
    webviewPanel?.dispose();
    typingHintDecoration?.dispose();
    watermarkDecoration?.dispose();
}