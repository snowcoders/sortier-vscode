"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { formatFile } from "@snowcoders/sortier";
import * as cosmiconfig from "cosmiconfig";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand("sortier.run", () => {
    // The code you place here will be executed every time your command is executed
    var editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage("No open text editor");
      return;
    }

    findAndRunSortier(editor.document);
  });

  context.subscriptions.push(disposable);

  const extensionName = "sortier";
  if (vscode.workspace.getConfiguration(extensionName).get<Boolean>("onSave")) {
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      findAndRunSortier(document, false);
    });
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}

function findAndRunSortier(
  document: vscode.TextDocument,
  messageIfFileNotSupported: boolean = true
) {
  vscode.workspace
    .findFiles("package.json", "**/node_modules/**", 1)
    .then(value => {
      if (value.length !== 0) {
        let path = value[0].fsPath;
        path = path.substring(0, path.length - "package.json".length);
        if (path.indexOf("\\") !== -1) {
          path = path + "node_modules\\@snowcoders\\sortier\\dist\\index.js";
        } else {
          path = path + "node_modules/@snowcoders/sortier/dist/index.js";
        }
        try {
          let localSortier = require(path);
          if (localSortier.formatFile != null) {
            console.log("Found local sortier. Formatting...");
            runSortier(
              document,
              messageIfFileNotSupported,
              localSortier.formatFile
            );
            return;
          }
        } catch {}
      }

      console.log("Didn't find local sortier, using bundled");
      runSortier(document, messageIfFileNotSupported, formatFile);
    });
}

function runSortier(
  document: vscode.TextDocument,
  messageIfFileNotSupported: boolean = true,
  formatFunc: typeof formatFile
) {
  try {
    const explorer = cosmiconfig("sortier");
    const result = explorer.searchSync(document.fileName);
    if (result == null) {
      console.log("No valid sortier config file found. Using defaults...");
    }
    let options = result == null ? {} : result.config;

    formatFunc(document.fileName, options);
  } catch (e) {
    if (e.message === "File not supported" && !messageIfFileNotSupported) {
      return;
    }
    vscode.window.showErrorMessage("Sortier threw an error: " + e.message);
  }
}
