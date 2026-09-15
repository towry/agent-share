// Chat webview-side keyboard handler.
// Called from native via webView.evaluateJavaScript when keyboard will show/hide.

window.__onKeyboardShow = function (kbHeight) {
  const list = document.getElementById('messageList');
  if (!list) return;

  list.style.paddingBottom = kbHeight + 'px';

  const lastMsg = list.lastElementChild;
  if (lastMsg) {
    lastMsg.scrollIntoView({ block: 'end', behavior: 'auto' });
  }
};

// Note: __onKeyboardHide is not implemented yet.
