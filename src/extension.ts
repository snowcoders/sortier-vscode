// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { readFileSync } from "fs";
import { formatText, isIgnored, resolveOptions } from "sortier";

type SortierFunctions = {
  formatText: typeof formatText;
  isIgnored: typeof isIgnored;
  resolveOptions: typeof resolveOptions;
};
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
      vscode.window.showInformationMessage("No active document. Nothing was sorted.");
      return;
    }
    return sortDocument(editor.document, false);
  });

  context.subscriptions.push(disposable);

  vscode.workspace.onDidChangeConfiguration((event) => {
    loadOnSaveConfiguration(context);
  });
  loadOnSaveConfiguration(context);
}

let didSaveTextDisposable: null | vscode.Disposable;
function loadOnSaveConfiguration(context: vscode.ExtensionContext) {
  const runOnSave = vscode.workspace.getConfiguration(extensionName).get<Boolean>("onSave");
  if (runOnSave) {
    if (didSaveTextDisposable != null) {
      // Already created, no need to recreate
      return;
    }

    didSaveTextDisposable = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
      return sortDocument(document, true);
    });
    context.subscriptions.push(didSaveTextDisposable);
  } else {
    if (didSaveTextDisposable == null) {
      // Already disposed
      return;
    }
    didSaveTextDisposable.dispose();
    didSaveTextDisposable = null;
  }
}

async function sortDocument(document: vscode.TextDocument, isOnSave: boolean) {
  const sortier = await findSortier();
  if (sortier == null) {
    vscode.window.showInformationMessage("Unable to find sortier instance to use");
    return;
  }
  try {
    if (isOnSave && (await isDocumentIgnored(sortier, document))) {
      return;
    }
    const oldText = document.getText();
    const options = getResolveOptionsForDocument(sortier, document);
    const fileExtension = getFileExtension(document);
    const newText = sortier.formatText(fileExtension, oldText, options);
    if (newText == null || oldText === newText) {
      return;
    }

    const edits = new vscode.WorkspaceEdit();
    const documentRange = fullDocumentRange(document);
    edits.replace(document.uri, documentRange, newText);

    vscode.workspace.applyEdit(edits).then(() => {
      if (isOnSave) {
        document.save();
      }
    });
  } catch (e) {
    if (!isOnSave) {
      vscode.window.showInformationMessage(getStringFromThrown(e));
    }
    return;
  }
}

function getStringFromThrown(e: unknown) {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === "string") {
    return e;
  }
  return JSON.stringify(e);
}

function fullDocumentRange(document: vscode.TextDocument): vscode.Range {
  const lastLineId = document.lineCount - 1;
  return new vscode.Range(0, 0, lastLineId, document.lineAt(lastLineId).text.length);
}

function isDocumentIgnored(sortier: SortierFunctions, document: vscode.TextDocument): vscode.ProviderResult<boolean> {
  const uri = document.uri || vscode.workspace.workspaceFolders?.[0].uri;
  const relativeFilePath = vscode.workspace.asRelativePath(uri);

  return vscode.workspace.findFiles(".sortierignore").then((fileMatches) => {
    if (fileMatches.length === 0) {
      return false;
    }

    try {
      const ignoreFileContents = readFileSync(fileMatches[0].fsPath, "utf8");
      return sortier.isIgnored(ignoreFileContents, relativeFilePath);
    } catch (error: unknown) {
      return false;
    }
  });
}

function getResolveOptionsForDocument(sortier: SortierFunctions, document: vscode.TextDocument) {
  const uri = document.uri || vscode.workspace.workspaceFolders?.[0].uri;
  const options = sortier.resolveOptions(uri.fsPath);
  return options;
}

function findSortier(): vscode.ProviderResult<SortierFunctions> {
  return vscode.workspace.findFiles("node_modules/sortier/dist/lib/index.js").then((fileMatches) => {
    const defaultResult = {
      formatText,
      isIgnored,
      resolveOptions,
    };
    if (fileMatches.length === 0) {
      return defaultResult;
    }

    const { path, scheme } = fileMatches[0];
    return import(`${scheme}://${path}`)
      .then((localSortier) => {
        return localSortier as SortierFunctions;
      })
      .catch(() => {
        return defaultResult;
      });
  });
}

const getLanguageExtension = (languageId: string) =>
  vscode.extensions.all
    .map((i) => <any[]>(i.packageJSON as any)?.contributes?.languages)
    .filter((i) => i)
    .reduce((a, b) => a.concat(b), [])
    .filter((i) => i.id === languageId && 0 < (i.extensions?.length ?? 0))
    .map((i) => i?.extensions?.[0])?.[0] ?? languageId;

function getFileExtension(document: vscode.TextDocument) {
  // First if it's an existing document, just use the extension
  const { fileName, languageId } = document;
  if (fileName && fileName.indexOf(".") !== -1) {
    return fileName.substring(fileName.lastIndexOf(".") + 1);
  }

  const extension = getLanguageExtension(languageId);
  return extension.substring(extension.lastIndexOf(".") + 1);
}
