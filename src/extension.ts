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
const outputChannel = vscode.window.createOutputChannel("Sortier");
type LogMessageParameters = Parameters<(typeof console)["log"]>;
function writeLog(level: "debug" | "error" | "warn", ...messages: LogMessageParameters) {
  outputChannel.appendLine(`[${level}] ${messages.join(" ")}`);
}
const outputConsole = {
  debug: (...messages: LogMessageParameters) => writeLog("debug", ...messages),
  error: (...messages: LogMessageParameters) => writeLog("error", ...messages),
  warn: (...messages: LogMessageParameters) => writeLog("warn", ...messages),
};

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
      outputConsole.debug("No active document");
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
    outputConsole.debug("findSortier failed to provide a result");
    vscode.window.showInformationMessage("Unable to find instance of sortier to use");
    return;
  }
  try {
    if (isOnSave && (await isDocumentIgnored(sortier, document))) {
      outputConsole.debug("Document is ignored, skipping");
      return;
    }
    outputConsole.debug("Document is not ignored, sorting");
    const oldText = document.getText();
    const options = getResolveOptionsForDocument(sortier, document);
    outputConsole.debug(`Resolved options: ${JSON.stringify(options)}`);
    const fileExtension = getFileExtension(document);
    outputConsole.debug(`Resolved file extension: ${fileExtension}`);
    outputConsole.debug("Sorting starting");
    const newText = sortier.formatText(fileExtension, oldText, options);
    outputConsole.debug("Sorting complete");
    if (newText == null || oldText === newText) {
      return;
    }

    const edits = new vscode.WorkspaceEdit();
    const documentRange = fullDocumentRange(document);
    edits.replace(document.uri, documentRange, newText);

    outputConsole.debug("Applying edits to vscode");
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

async function findSortier(): Promise<SortierFunctions> {
  const defaultResult = {
    formatText,
    isIgnored,
    resolveOptions,
  };

  const esmResult = await findLocalPackage<SortierFunctions>("node_modules/sortier/dist/lib/index.js");
  if (esmResult) {
    return esmResult;
  }
  const cjsResult = await findLocalPackage<SortierFunctions>("node_modules/sortier/dist-cjs/lib/index.js");
  if (cjsResult) {
    return cjsResult;
  }

  outputConsole.debug("Use extension sortier version");
  return defaultResult;
}

async function findLocalPackage<T>(nodeModulesPath: string): Promise<null | T> {
  outputConsole.debug("Searching for sortier at", nodeModulesPath);
  const fileMatches = await vscode.workspace.findFiles(nodeModulesPath);
  if (fileMatches.length === 0) {
    outputConsole.debug("None found");
    return null;
  }

  const { path, scheme } = fileMatches[0];
  try {
    outputConsole.debug("Attempting import");
    const localSortierImport = await import(`${scheme}://${path}`);
    outputConsole.debug("Success");
    return localSortierImport as T;
  } catch {
    outputConsole.debug("Failed");
    outputConsole.debug("Attempting require", nodeModulesPath);
    try {
      const requireResult = require("sortier");
      outputConsole.debug("Success");
      return requireResult;
    } catch {
      outputConsole.debug("Failed");
      return null;
    }
  }
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
