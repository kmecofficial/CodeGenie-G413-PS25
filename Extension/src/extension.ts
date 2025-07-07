import * as vscode from 'vscode';
import axios from 'axios';
import { getWebviewContent ,getWebviewContentCodeSuggestion} from './webviewContent';
import * as path from 'path';


let panel: vscode.WebviewPanel | undefined;

let allGeneratedInlineSolutions: string[] = []; 
let originalPromptRange: vscode.Range | null = null; 
let originalPromptContent: string | null = null; 
let lastActiveInlineInsertionRange: vscode.Range | null = null; 
let currentInlineBlockRange: vscode.Range | null = null; 

let panelOriginalPromptRange: vscode.Range | null = null;
let panelOriginalPromptContent: string | null = null;
let lastActivePanelInsertionRange: vscode.Range | null = null; 
let currentPanelSolutions: string[] = []; 


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
    html: { name: 'HTML', singleLineComment: '', blockCommentStart: '<!--', blockCommentEnd: '-->' },
    xml: { name: 'XML', singleLineComment: '', blockCommentStart: '<!--', blockCommentEnd: '-->' },
    css: { name: 'CSS', singleLineComment: '/*', blockCommentStart: '/*', blockCommentEnd: '*/' },
    json: { name: 'JSON', singleLineComment: '//' } 

};

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGenie extension is now active!');

        context.subscriptions.push(
            vscode.commands.registerCommand('codegenie.PanelSuggestions', async () => {
                handleSuggestion(context, 'panel');
            })
        );

        context.subscriptions.push(
            vscode.commands.registerCommand('codegenie.InlineSuggestions', async () => {
                handleSuggestion(context, 'inline');
            })
        );
        for (let i = 1; i <= 9; i++) { 
            context.subscriptions.push(
                vscode.commands.registerCommand(`codegenie.inline.insertSolution${i}`, () => toggleInlineSolution(i, 'insert')),
                vscode.commands.registerCommand(`codegenie.inline.deleteSolution${i}`, () => toggleInlineSolution(i, 'delete'))
            );
        }

        context.subscriptions.push(
            vscode.commands.registerCommand('codegenie.inline.revertPrompt', async () => {
                await revertToOriginalPrompt();
            })
        );
    


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
        title: `Generating code (${mode === 'panel' ? 'Panel' : 'Inline'})...`,
        cancellable: false
    }, async () => {
        try {
            let generated;
            try {
                console.log("Client sending request to backend with prompt:", selectedText);
                console.log("Client sending language:", langConfig.name); 

                const response = await axios.post('http://127.0.0.1:5000/generate', {
                    prompt: selectedText,
                    language: langConfig.name
                });

                console.log("Received response from backend:", response.data);
                generated = response.data.response;
            } catch (error) {
                console.error("Error during API request:", error);
                if (axios.isAxiosError(error) && error.response) {
                    console.error('API Response Status:', error.response.status);
                    console.error('API Response Data:', error.response.data);
                    vscode.window.showErrorMessage(
                        `Failed to generate code: ${error.response.status} - ${error.response.data?.error || error.response.statusText || 'Unknown error'}`
                    );
                } else {
                    vscode.window.showErrorMessage('Failed to generate code: ' + (error instanceof Error ? error.message : String(error)));
                }
                return;
            }
            let generatedCode = generated;
            if (!generatedCode || typeof generatedCode !== 'string') {
                throw new Error('Unexpected response format from backend.');
            }

            const parts = generatedCode.split(/(Solution\s*\d+\s*:\s*(?:Using\s*(?:functions|recursion|iteration))?)/);
            const solutionsWithHeadersAndPrompt: string[] = []; 

            for (let i = 1; i < parts.length; i += 2) {
                const header = parts[i].trim();
                const body = (parts[i + 1] || '').trim();
                if (body) {
                    
                    solutionsWithHeadersAndPrompt.push(header + '\n' + body);
                }
            }
            console.log("Parsed solutions with headers and prompt:", solutionsWithHeadersAndPrompt);

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

                panel.webview.html = getWebviewContentCodeSuggestion(selectedText, solutionsWithHeadersAndPrompt);
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
                                let replaceRange: vscode.Range;
                                if (lastActivePanelInsertionRange) {
                                    
                                    replaceRange = lastActivePanelInsertionRange;
                                } else {
                                    
                                    replaceRange = panelOriginalPromptRange!; 
                                }

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
                                let rangeToClear: vscode.Range | null = null;
                                if (lastActivePanelInsertionRange) {
                                    rangeToClear = lastActivePanelInsertionRange;
                                } else {
                                    rangeToClear = panelOriginalPromptRange; 
                                }

                                if (rangeToClear) {
                                    
                                    editBuilder.replace(rangeToClear, panelOriginalPromptContent!); 
                                } else {

                                    if (panelOriginalPromptRange && panelOriginalPromptContent) {
                                        editBuilder.insert(panelOriginalPromptRange.start, panelOriginalPromptContent);
                                    } else {
                                        vscode.window.showErrorMessage('No valid range or content to revert for panel deletion.');
                                    }
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
                allGeneratedInlineSolutions = solutionsWithHeadersAndPrompt; 
                originalPromptRange = selection;
                originalPromptContent = selectedText;

                lastActiveInlineInsertionRange = null;
                currentInlineBlockRange = null; 

                const editor = savedEditor;
                let summaryContent = '';
                let commentPrefix = langConfig.singleLineComment;
                let blockCommentStart = langConfig.blockCommentStart;
                let blockCommentEnd = langConfig.blockCommentEnd;

                if (blockCommentStart && blockCommentEnd && (detectedLanguage === 'html' || detectedLanguage === 'xml' || detectedLanguage === 'css')) {
                   
                    summaryContent += `${blockCommentStart} CodeGenie Solutions for: ${selectedText.split('\n')[0]} ${blockCommentEnd}\n\n`;
                } else if (commentPrefix) {
                   
                    summaryContent += `${commentPrefix} CodeGenie Solutions for: ${selectedText.split('\n')[0]}\n\n`;
                } else {
                    
                    summaryContent += `CodeGenie Solutions for: ${selectedText.split('\n')[0]}\n\n`;
                }

                solutionsWithHeadersAndPrompt.forEach((sol) => {
                    
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
                currentInlineBlockRange = new vscode.Range(selection.start, new vscode.Position(newEndLine, newEndChar));

                vscode.window.showInformationMessage(
                    `CodeGenie: ${solutionsWithHeadersAndPrompt.length} solutions generated. Select 1, 2, or 3 to insert, Ctrl+1/2/3 to revert to options, Esc to clear.`
                );
            }

        } catch (error) {
            console.error("Error in handleSuggestion:", error);
            vscode.window.showErrorMessage('Error generating code: ' + (error instanceof Error ? error.message : String(error)));
        }
    });
}

async function toggleInlineSolution(index: number, action: 'insert' | 'delete') {
    console.log("toggleInlineSolution triggered for index:", index, "action:", action);
    const editor = vscode.window.activeTextEditor;
    if (!editor || !originalPromptRange || !originalPromptContent || allGeneratedInlineSolutions.length === 0) {
        vscode.window.showInformationMessage('No active editor, original prompt, or solutions to toggle.');
        return;
    }

    const detectedLanguage = editor.document.languageId;
    const langConfig = languageMap[detectedLanguage];
    if (!langConfig) {
        vscode.window.showWarningMessage(`Unsupported language: '${detectedLanguage}'. Cannot toggle inline solution.`);
        return;
    }

    try {
        await editor.edit(editBuilder => {
            if (action === 'insert') {
                let targetSolutionContent = allGeneratedInlineSolutions[index - 1]; 
                if (!targetSolutionContent) {
                    vscode.window.showInformationMessage(`Solution ${index} not found.`);
                    return;
                }

                const lines = targetSolutionContent.split('\n');
                if (lines.length > 0 && lines[0].startsWith('Solution ')) {
                    targetSolutionContent = lines.slice(1).join('\n'); 
                }

                let replaceRange: vscode.Range;
                if (lastActiveInlineInsertionRange) {
                    
                    replaceRange = lastActiveInlineInsertionRange;
                } else if (currentInlineBlockRange) {
                    
                    replaceRange = currentInlineBlockRange;
                } else {
                    
                    vscode.window.showErrorMessage('No active block or solution to replace.');
                    return;
                }

                editBuilder.replace(replaceRange, targetSolutionContent);

                const newStart = replaceRange.start;
                const linesAfterInsert = targetSolutionContent.split('\n');
                const newEndLine = newStart.line + linesAfterInsert.length - 1;
                const newEndChar = lines.length > 0 ? linesAfterInsert[linesAfterInsert.length - 1].length : 0;
                lastActiveInlineInsertionRange = new vscode.Range(newStart, new vscode.Position(newEndLine, newEndChar));
                currentInlineBlockRange = null;

                vscode.window.showInformationMessage(`Inserted Solution ${index}.`);
            } else { 
              
                if (lastActiveInlineInsertionRange) {
                    
                    let summaryContent = '';
                    let commentPrefix = langConfig.singleLineComment;
                    let blockCommentStart = langConfig.blockCommentStart;
                    let blockCommentEnd = langConfig.blockCommentEnd;
                    if (originalPromptContent) {
                        if (blockCommentStart && blockCommentEnd && (detectedLanguage === 'html' || detectedLanguage === 'xml' || detectedLanguage === 'css')) {
                            summaryContent += `${blockCommentStart} CodeGenie Solutions for: ${originalPromptContent.split('\n')[0]} ${blockCommentEnd}\n\n`;
                        } else if (commentPrefix) {
                            summaryContent += `${commentPrefix} CodeGenie Solutions for: ${originalPromptContent.split('\n')[0]}\n\n`;
                        } else {
                            summaryContent += `CodeGenie Solutions for: ${originalPromptContent.split('\n')[0]}\n\n`;
                        }
                    }
                    allGeneratedInlineSolutions.forEach((sol) => {
                        summaryContent += `${sol}\n\n`;
                    });

                    if (blockCommentStart && blockCommentEnd && (detectedLanguage === 'html' || detectedLanguage === 'xml' || detectedLanguage === 'css')) {
                        summaryContent += `${blockCommentStart} Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear. ${blockCommentEnd}`;
                    } else if (commentPrefix) {
                        summaryContent += `${commentPrefix} Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear.`;
                    } else {
                        summaryContent += `Press 1, 2, or 3 to insert a solution, Ctrl+1/2/3 to revert to solution options, Esc to clear.`;
                    }

                    editBuilder.replace(lastActiveInlineInsertionRange, summaryContent);
                    const newStart = lastActiveInlineInsertionRange.start;
                    const lines = summaryContent.split('\n');
                    const newEndLine = newStart.line + lines.length - 1;
                    const newEndChar = lines.length > 0 ? lines[lines.length - 1].length : 0;
                    currentInlineBlockRange = new vscode.Range(newStart, new vscode.Position(newEndLine, newEndChar));

                    lastActiveInlineInsertionRange = null; 
                    vscode.window.showInformationMessage('Reverted to solution options.');
                } else if (currentInlineBlockRange) {
                    vscode.window.showInformationMessage('Solution options are already displayed. Use Esc to revert to original prompt.');
                }
                else {
                    vscode.window.showInformationMessage('No active solution or summary block to revert.');
                }
            }
        });
    } catch (e) {
        console.error("Error during editor.edit in toggleInlineSolution:", e);
        vscode.window.showErrorMessage("Failed to toggle solution: " + (e instanceof Error ? e.message : String(e)));
    }
}

async function revertToOriginalPrompt() {
    const editor = vscode.window.activeTextEditor;
    if (!editor || !originalPromptRange || !originalPromptContent) {
        vscode.window.showInformationMessage('No active editor or original prompt to revert to.');
        return;
    }

    try {
        await editor.edit(editBuilder => {
            let rangeToClear: vscode.Range | null = null;
            if (lastActiveInlineInsertionRange) {
                rangeToClear = lastActiveInlineInsertionRange;
            } else if (currentInlineBlockRange) {
                rangeToClear = currentInlineBlockRange;
            } else {
                rangeToClear = originalPromptRange;
            }

            if (rangeToClear) {
                editBuilder.replace(rangeToClear, originalPromptContent!); 
            } else {
                if (originalPromptRange && originalPromptContent) {
                    editBuilder.insert(originalPromptRange.start, originalPromptContent);
                } else {
                    vscode.window.showErrorMessage('No valid range or content to revert.');
                }
            }
        });
        allGeneratedInlineSolutions = [];
        originalPromptRange = null;
        originalPromptContent = null;
        lastActiveInlineInsertionRange = null;
        currentInlineBlockRange = null;

        vscode.window.showInformationMessage('Reverted to original prompt. All inline suggestions cleared.');
    } catch (e) {
        console.error("Error during editor.edit for revert:", e);
        vscode.window.showErrorMessage("Failed to revert to original prompt: " + (e instanceof Error ? e.message : String(e)));
        }
    }

export function deactivate() { }