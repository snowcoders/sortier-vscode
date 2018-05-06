'use strict';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import * as cosmiconfig from "cosmiconfig";
import { format, ReprinterOptions } from "@snowcoders/sortier";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('extension.sortier', () => {
        // The code you place here will be executed every time your command is executed
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No open text editor');
            return;
        }

        try {
            runSortier(editor.document);
        }
        catch (e) {
            vscode.window.showErrorMessage("Sortier threw an error: " + e.message);
        }
    });

    context.subscriptions.push(disposable);

    const extensionName = 'sortier';
    if (vscode.workspace.getConfiguration(extensionName).get<Boolean>('onSave')) {
        vscode.workspace.onDidSaveTextDocument(runSortier, false);
    };
}

// this method is called when your extension is deactivated
export function deactivate() {
}

function runSortier(document: vscode.TextDocument, messageIfFileNotSupported: boolean = true) {
    try {
        const explorer = cosmiconfig("sortier");
        const result = explorer.searchSync();
        if (result == null) {
            console.log("No valid sortier config file found. Using defaults...");
        }
        let options = result == null ? {} : result.config as ReprinterOptions;

        format(document.fileName, options);
    }
    catch (e) {
        if (messageIfFileNotSupported) {
            if (e.message !== "File not supported") {
                vscode.window.showErrorMessage("Sortier threw an error: " + e.message);
            }
        }
    }
}