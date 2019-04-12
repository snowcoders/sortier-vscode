// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import vscode from "vscode";

import { format } from "@snowcoders/sortier";
import cosmiconfig from "cosmiconfig";
import micromatch from "micromatch";

const extensionName = "sortier";

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
  const fileName = document.fileName;

  let included = true;
  const inclusions = vscode.workspace
    .getConfiguration(extensionName)
    .get<Array<string>>("includes");
  if (inclusions != null && inclusions.length > 0) {
    let mic = micromatch;
    included = mic.isMatch(fileName, inclusions);
  }

  if (!included) {
    return;
  }

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
          console.log("Found local sortier. Formatting...");
          runSortier(document, messageIfFileNotSupported, localSortier.format);
          return;
        } catch {}
      }

      console.log("Didn't find local sortier, using bundled");
      runSortier(document, messageIfFileNotSupported, format);
    });
}

function runSortier(
  document: vscode.TextDocument,
  messageIfFileNotSupported: boolean = true,
  formatFunc: typeof format
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
