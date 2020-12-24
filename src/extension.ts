"use strict";

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import * as Sortier from "@snowcoders/sortier";
import { cosmiconfigSync } from "cosmiconfig";

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

    getSortedText(editor.document, true).then((newText) => {
      const oldText = editor.document.getText();
      if (newText == null || oldText === newText) {
        return;
      }

      editor.edit((editBuilder) => {
        const replaceRange = new vscode.Range(
          editor.document.positionAt(0),
          editor.document.positionAt(editor.document.getText().length)
        );
        editBuilder.replace(replaceRange, newText);
      });
    });
  });

  context.subscriptions.push(disposable);

  const extensionName = "sortier";
  if (vscode.workspace.getConfiguration(extensionName).get<Boolean>("onSave")) {
    vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      sortDocument(document);
    });
  }
}

// this method is called when your extension is deactivated
export function deactivate() {}

function getSortedText(
  document: vscode.TextDocument,
  messageIfFileNotSupported: boolean = true
): Thenable<string> {
  return findSortier().then((sortier) => {
    return getSortedDocumentText(
      document,
      messageIfFileNotSupported,
      sortier.formatText
    );
  });
}

function sortDocument(document: vscode.TextDocument): Thenable<void> {
  return findSortier().then((sortier) => {
    const options = getSortierOptions(document);
    try {
      sortier.formatFile(document.fileName, options);
    } catch {}
  });
}

function findSortier(): Thenable<typeof Sortier> {
  return vscode.workspace
    .findFiles("package.json", "**/node_modules/**", 1)
    .then((value) => {
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
          return localSortier;
        } catch {}
      }

      console.log("Didn't find local sortier, using bundled");
      return Sortier;
    });
}

function getSortedDocumentText(
  document: vscode.TextDocument,
  messageIfFileNotSupported: boolean = true,
  formatFunc: typeof Sortier.formatText
): string {
  try {
    let options = getSortierOptions(document);
    const fileExtension = getFileExtension(document);

    const formatted = formatFunc(fileExtension, document.getText(), options);
    if (formatted == null) {
      throw new Error("File not supported");
    }
    return formatted;
  } catch (e) {
    if (e.message === "File not supported" && !messageIfFileNotSupported) {
      return;
    }
    vscode.window.showErrorMessage("Sortier threw an error: " + e.message);
  }
}

function getSortierOptions(document: vscode.TextDocument) {
  const explorer = cosmiconfigSync("sortier");
  const result = explorer.search(document.fileName);
  if (result == null) {
    console.log("No valid sortier config file found. Using defaults...");
  }
  let options = result == null ? {} : result.config;
  return options;
}

function getFileExtension(document: vscode.TextDocument) {
  // First if it's an existing document, just use the extension
  const { fileName, languageId } = document;
  if (fileName && fileName.indexOf(".") !== -1) {
    return fileName.substr(fileName.lastIndexOf(".") + 1);
  }

  // Otherwise try and get it from the language id
  switch (languageId) {
    case "javascript": {
      return "js";
    }
    case "javascriptreact":
    case "jsx": {
      return "jsx";
    }
    case "json":
    case "jsonc": {
      return "json";
    }
    case "typescript": {
      return "ts";
    }
    case "typescriptreact": {
      return "tsx";
    }
    default:
      return languageId;
  }
}
