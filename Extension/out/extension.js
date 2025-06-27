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
const webviewContent_1 = require("./webviewContent");
const path = __importStar(require("path"));
function activate(context) {
    let disposable = vscode.commands.registerCommand('codegenie.generateSnippet', () => {
        const panel = vscode.window.createWebviewPanel('codegeniePanel', 'CodeGenie ✨', vscode.ViewColumn.Beside, { enableScripts: true });
        // const logoUri = panel.webview.asWebviewUri(
        //     vscode.Uri.joinPath(context.extensionUri, 'media', 'logo.png')
        // );
        const logoPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'logo.png'));
        const logoUri = panel.webview.asWebviewUri(logoPath);
        panel.webview.html = (0, webviewContent_1.getWebviewContent)(logoUri.toString());
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'generate') {
                try {
                    const response = await axios_1.default.post('http://localhost:5000/generate-snippet', {
                        context: message.text,
                        language: 'python'
                    });
                    panel.webview.postMessage({ command: 'result', code: response.data.code });
                }
                catch (error) {
                    panel.webview.postMessage({ command: 'result', code: 'Failed to generate code.' });
                }
            }
        }, undefined, context.subscriptions);
    });
    context.subscriptions.push(disposable);
}
//# sourceMappingURL=extension.js.map