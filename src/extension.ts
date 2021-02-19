import * as vscode from 'vscode';

const myProvider = new (class implements vscode.CustomTextEditorProvider {
  private updateTextDocument(document: vscode.TextDocument, text: string) {
    const edit = new vscode.WorkspaceEdit();

    // Just replace the entire document every time for this example extension.
    // A more complete extension should compute minimal edits instead.
    edit.replace(
      document.uri,
      new vscode.Range(0, 0, document.lineCount, 0),
      text
    );

    return vscode.workspace.applyEdit(edit);
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.onDidReceiveMessage(({
      type, payload
    }) => {
      switch (type) {
        case 'update':
          this.updateTextDocument(document, payload)
          break;

        default:
          break;
      }
    })
    webviewPanel.webview.html = `
<html>
  <head>
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'self' https://cdn.jsdelivr.net;
      script-src 'unsafe-inline' ${
        webviewPanel.webview.cspSource
      } https://cdn.jsdelivr.net;
      style-src https://maxcdn.bootstrapcdn.com https://cdn.jsdelivr.net ${
        webviewPanel.webview.cspSource
      };
      font-src https://cdn.jsdelivr.net https://maxcdn.bootstrapcdn.com;
      img-src *;"
    />
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.css">
  </head>
  <body>
    <textarea>${document.getText()}</textarea>
    <script src="https://cdn.jsdelivr.net/simplemde/latest/simplemde.min.js"></script>
    <script>
      const simplemde = new SimpleMDE({
        showIcons: ["code", "table"],
      });
      const vscode = acquireVsCodeApi();

      simplemde.codemirror.on("change", function(){
        vscode.postMessage({
          type: 'update',
          payload: simplemde.value()
        })
      });
    </script>
  </body>
</html>`;
  }
})();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('md.md', myProvider)
  );
}

export function deactivate() {}
