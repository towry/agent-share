import UIKit
import WebKit

class ChatViewController: UIViewController {
    private var webView: WKWebView!

    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow(_:)),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
    }

    private func setupWebView() {
        webView = WKWebView(frame: view.bounds)
        view.addSubview(webView)
    }

    @objc func keyboardWillShow(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let kbFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else {
            return
        }
        let kbHeight = kbFrame.height
        let js = "window.__onKeyboardShow(\(kbHeight))"
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}
