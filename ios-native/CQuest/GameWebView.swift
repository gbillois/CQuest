import SwiftUI
import WebKit

struct GameWebView: UIViewRepresentable {

    func makeUIView(context: Context) -> WKWebView {
        let handler = BundleSchemeHandler()

        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(handler, forURLScheme: "app")
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs

        // Inject CSS overrides so the game fills the full screen
        // instead of being constrained to a phone-sized card.
        let nativeCSS = """
        html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: var(--bg-deep) !important;
        }
        .app {
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
        }
        .game-shell {
            width: 100% !important;
            max-width: none !important;
            height: 100% !important;
            max-height: none !important;
            border-radius: 0 !important;
            border: none !important;
            box-shadow: none !important;
            aspect-ratio: unset !important;
        }
        """
        let cssScript = WKUserScript(
            source: """
            const s = document.createElement('style');
            s.textContent = `\(nativeCSS)`;
            document.documentElement.appendChild(s);
            """,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        config.userContentController.addUserScript(cssScript)

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0x1a / 255.0,
                                          green: 0x16 / 255.0,
                                          blue: 0x44 / 255.0,
                                          alpha: 1)
        webView.underPageBackgroundColor = webView.backgroundColor

        // Disable scrolling & bounce – the game canvas handles everything
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Prevent pinch-to-zoom at the native level
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0

        // Allow the WebView content inspector in DEBUG builds
        #if DEBUG
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }
        #endif

        if let url = URL(string: "app://localhost/index.html") {
            webView.load(URLRequest(url: url))
        }

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

// MARK: - Custom URL-scheme handler

/// Serves files from the app bundle for the `app://` scheme.
/// This is required because WKWebView blocks ES-module imports over `file://`.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {

    private var activeTasks = Set<ObjectIdentifier>()

    // MARK: WKURLSchemeHandler

    func webView(_ webView: WKWebView,
                 start urlSchemeTask: any WKURLSchemeTask) {
        let taskId = ObjectIdentifier(urlSchemeTask as AnyObject)
        activeTasks.insert(taskId)

        guard let url = urlSchemeTask.request.url else {
            fail(urlSchemeTask, id: taskId, error: URLError(.badURL))
            return
        }

        var relativePath = url.path
        if relativePath.hasPrefix("/") { relativePath = String(relativePath.dropFirst()) }
        if relativePath.isEmpty { relativePath = "index.html" }

        guard let bundleRoot = Bundle.main.resourceURL else {
            fail(urlSchemeTask, id: taskId, error: URLError(.fileDoesNotExist))
            return
        }

        let fileURL = bundleRoot.appendingPathComponent(relativePath)

        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            fail(urlSchemeTask, id: taskId, error: URLError(.fileDoesNotExist))
            return
        }

        do {
            let data = try Data(contentsOf: fileURL)
            guard activeTasks.contains(taskId) else { return }

            let mime = Self.mimeType(for: relativePath)
            let headers: [String: String] = [
                "Content-Type": mime,
                "Content-Length": "\(data.count)",
                "Access-Control-Allow-Origin": "*",
            ]
            let response = HTTPURLResponse(url: url,
                                           statusCode: 200,
                                           httpVersion: "HTTP/1.1",
                                           headerFields: headers)!

            urlSchemeTask.didReceive(response)
            urlSchemeTask.didReceive(data)
            urlSchemeTask.didFinish()
            activeTasks.remove(taskId)
        } catch {
            fail(urlSchemeTask, id: taskId, error: error)
        }
    }

    func webView(_ webView: WKWebView,
                 stop urlSchemeTask: any WKURLSchemeTask) {
        let taskId = ObjectIdentifier(urlSchemeTask as AnyObject)
        activeTasks.remove(taskId)
    }

    // MARK: Helpers

    private func fail(_ task: any WKURLSchemeTask,
                      id: ObjectIdentifier,
                      error: Error) {
        guard activeTasks.remove(id) != nil else { return }
        task.didFailWithError(error)
    }

    private static func mimeType(for path: String) -> String {
        let ext = (path as NSString).pathExtension.lowercased()
        switch ext {
        case "html":          return "text/html; charset=utf-8"
        case "css":           return "text/css; charset=utf-8"
        case "js", "mjs":     return "application/javascript; charset=utf-8"
        case "json":          return "application/json; charset=utf-8"
        case "png":           return "image/png"
        case "jpg", "jpeg":   return "image/jpeg"
        case "gif":           return "image/gif"
        case "svg":           return "image/svg+xml"
        case "woff":          return "font/woff"
        case "woff2":         return "font/woff2"
        case "webmanifest":   return "application/manifest+json"
        case "ico":           return "image/x-icon"
        default:              return "application/octet-stream"
        }
    }
}
