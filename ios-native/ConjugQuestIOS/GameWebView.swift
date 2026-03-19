import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let preferences = WKWebpagePreferences()
        preferences.allowsContentJavaScript = true
        config.defaultWebpagePreferences = preferences
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.setURLSchemeHandler(context.coordinator.bundleSchemeHandler, forURLScheme: "app")

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.bouncesZoom = false
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.pinchGestureRecognizer?.isEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.showsVerticalScrollIndicator = false
        webView.scrollView.showsHorizontalScrollIndicator = false
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        loadGame(in: webView)
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {
        // No-op. The game is stateful and self-managed in JS once loaded.
    }

    private func loadGame(in webView: WKWebView) {
        guard
            let webRootURL = Bundle.main.resourceURL?.appendingPathComponent("WebApp", isDirectory: true)
        else {
            webView.loadHTMLString(errorHTML("WebApp folder missing in bundle."), baseURL: nil)
            return
        }

        let indexURL = webRootURL.appendingPathComponent("index.html")
        guard FileManager.default.fileExists(atPath: indexURL.path) else {
            webView.loadHTMLString(errorHTML("index.html not found in WebApp bundle folder."), baseURL: nil)
            return
        }

        contextLoadWithAppScheme(webView)
    }

    private func contextLoadWithAppScheme(_ webView: WKWebView) {
        guard let startURL = URL(string: "app://webapp/index.html") else {
            webView.loadHTMLString(errorHTML("Unable to create app:// URL."), baseURL: nil)
            return
        }
        webView.load(URLRequest(url: startURL))
    }

    private func errorHTML(_ message: String) -> String {
        """
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <style>
              body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: #090d1c;
                color: #f7fbff;
                font-family: -apple-system, BlinkMacSystemFont, sans-serif;
                text-align: center;
                padding: 24px;
              }
              .card {
                max-width: 560px;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 14px;
                padding: 18px;
                background: rgba(255,255,255,0.06);
              }
              code {
                color: #ffd56a;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>ConjugQuest iOS</h1>
              <p>\(message)</p>
              <p>Run <code>ios-native/scripts/sync_web_assets.sh</code> then rebuild.</p>
            </div>
          </body>
        </html>
        """
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let bundleSchemeHandler = BundleSchemeHandler()

        func webView(
            _ webView: WKWebView,
            didFail navigation: WKNavigation!,
            withError error: Error
        ) {
            print("[ConjugQuestIOS] Navigation failed:", error.localizedDescription)
        }

        func webView(
            _ webView: WKWebView,
            didFailProvisionalNavigation navigation: WKNavigation!,
            withError error: Error
        ) {
            print("[ConjugQuestIOS] Provisional navigation failed:", error.localizedDescription)
        }
    }
}

final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {
    private let fileManager = FileManager.default

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard
            let url = urlSchemeTask.request.url,
            url.scheme == "app",
            url.host == "webapp",
            let webRootURL = Bundle.main.resourceURL?.appendingPathComponent("WebApp", isDirectory: true)
        else {
            fail(task: urlSchemeTask, code: 400, description: "Invalid app:// request.")
            return
        }

        var relativePath = url.path
        if relativePath.isEmpty || relativePath == "/" {
            relativePath = "/index.html"
        }
        relativePath = String(relativePath.drop(while: { $0 == "/" }))

        let decodedRelativePath = relativePath.removingPercentEncoding ?? relativePath
        let candidateURL = webRootURL.appendingPathComponent(decodedRelativePath, isDirectory: false)
        let canonicalRoot = webRootURL.standardizedFileURL.path
        let canonicalCandidate = candidateURL.standardizedFileURL.path

        guard canonicalCandidate.hasPrefix(canonicalRoot) else {
            fail(task: urlSchemeTask, code: 403, description: "Forbidden path.")
            return
        }
        guard fileManager.fileExists(atPath: canonicalCandidate) else {
            fail(task: urlSchemeTask, code: 404, description: "Resource not found.")
            return
        }

        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: canonicalCandidate))
            let response = URLResponse(
                url: url,
                mimeType: mimeType(forPath: canonicalCandidate),
                expectedContentLength: data.count,
                textEncodingName: textEncoding(forPath: canonicalCandidate)
            )
            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
        } catch {
            fail(task: urlSchemeTask, code: 500, description: error.localizedDescription)
        }
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // No-op for static bundle files.
    }

    private func fail(task: WKURLSchemeTask, code: Int, description: String) {
        let error = NSError(
            domain: "ConjugQuestIOS.BundleSchemeHandler",
            code: code,
            userInfo: [NSLocalizedDescriptionKey: description]
        )
        task.didFailWithError(error)
    }

    private func mimeType(forPath path: String) -> String {
        switch URL(fileURLWithPath: path).pathExtension.lowercased() {
        case "html": return "text/html"
        case "js": return "application/javascript"
        case "css": return "text/css"
        case "json", "webmanifest": return "application/json"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "gif": return "image/gif"
        case "svg": return "image/svg+xml"
        case "webp": return "image/webp"
        case "ico": return "image/x-icon"
        case "woff": return "font/woff"
        case "woff2": return "font/woff2"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }

    private func textEncoding(forPath path: String) -> String? {
        let ext = URL(fileURLWithPath: path).pathExtension.lowercased()
        if ["html", "js", "css", "json", "webmanifest", "svg", "txt"].contains(ext) {
            return "utf-8"
        }
        return nil
    }
}
