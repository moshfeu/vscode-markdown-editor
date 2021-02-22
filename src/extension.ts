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
        case 'ready':
          webviewPanel.webview.postMessage({
            type: 'init',
            payload: document.getText()
          });
          break;
        case 'save':
          vscode.window.activeTextEditor?.document.save();
        default:
          break;
      }
    })
    webviewPanel.webview.html = /*html*/`
<html>
  <head>
    <meta http-equiv="Content-Security-Policy"
      content="default-src 'self' https://uicdn.toast.com;
      script-src 'unsafe-inline' ${
        webviewPanel.webview.cspSource
      } https://uicdn.toast.com;
      style-src https://uicdn.toast.com https://cdnjs.cloudflare.com ${
        webviewPanel.webview.cspSource
      } unsafe-inline;
      font-src https://uicdn.toast.com;
      frame-src http: https:;
      img-src * data:;"
    />
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.48.4/codemirror.min.css" />
    <link rel="stylesheet" href="https://uicdn.toast.com/editor/latest/toastui-editor.min.css" />
  </head>
  <body>
    <div id="editor"></div>
    <script src="https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js"></script>
    <script>
      const vscode = acquireVsCodeApi();
      const {Editor} = toastui;
      const editor = new Editor({
        usageStatistics: false,
        el: document.querySelector('#editor'),
        height: 'auto',
        // previewStyle: 'tab',
        initialEditType: 'wysiwyg',
        customHTMLSanitizer: html => html,
      });
      // unshadow "save"
      // editor.getSquire().setKeyHandler('ctrl-s', null);
      window.addEventListener('message', (({data: {type, payload}}) => {
        switch (type) {
          case 'init':
            init(payload);
            break;
        }
      }));

      vscode.postMessage({
        type: 'ready'
      });

      let first = true;
      function init(payload) {
        editor.setMarkdown(payload);
        let prevContent = '';
        editor.on('change', () => {
          // annoying
          if (first) {
            first = false;
            return;
          }
          const newContent = editor.getMarkdown();
          if (newContent === prevContent) {
            return;
          }
          vscode.postMessage({
            type: 'update',
            payload: newContent
          })
          prevContent = newContent;
        })
      }

      document.addEventListener('keydown', e => {
        if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
          editor.exec('Strike');
          vscode.postMessage({
            type: 'save'
          });
        }
      });
    </script>
  </body>
</html>
`;
  }
})();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider('md.md', myProvider)
  );
}

export function deactivate() {}
