import SwiftUI
import WebKit

// MARK: - SwiftUI ↔ UIKit Bridge

/// Wraps a full-screen WKWebView that loads the bundled web game.
/// All game rendering, layout, and input are handled by the web page —
/// this is a thin, transparent shell.
struct WebViewRepresentable: UIViewRepresentable {

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()

        // Register custom scheme so local files are served with correct MIME
        // types and the page's CSP (default-src 'self') is satisfied.
        let handler = BundleSchemeHandler()
        config.setURLSchemeHandler(handler, forURLScheme: "app")

        // Allow inline media (game audio if added later).
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []

        let webView = WKWebView(frame: .zero, configuration: config)

        // --- Pixel-perfect: disable all WKWebView chrome behaviour ---

        // No scroll / bounce — the game canvas fills the viewport.
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.scrollView.alwaysBounceVertical = false
        webView.scrollView.alwaysBounceHorizontal = false

        // No pinch-to-zoom — the viewport meta already sets initial-scale=1.
        webView.scrollView.minimumZoomScale = 1.0
        webView.scrollView.maximumZoomScale = 1.0

        // Let the web page manage safe-area insets via CSS env() values.
        // contentInsetAdjustmentBehavior = .never ensures the WebView does
        // not add its own insets on top of the CSS ones.
        webView.scrollView.contentInsetAdjustmentBehavior = .never

        // Transparent background so the app window colour shows through
        // during initial load (matches --bg-deep: #1a1644).
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.102, green: 0.086, blue: 0.267, alpha: 1) // #1a1644

        // Allow back-forward cache but disable navigation gestures.
        webView.allowsBackForwardNavigationGestures = false

        // Disable link preview / 3D-touch peek.
        webView.allowsLinkPreview = false

        // Load the game.
        if let entryURL = URL(string: "app://localhost/index.html") {
            webView.load(URLRequest(url: entryURL))
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Nothing to update — the web page is self-contained.
    }
}

// MARK: - Custom URL Scheme Handler

/// Serves files from the app bundle's "WebApp" folder in response to
/// `app://localhost/<path>` requests.  This satisfies the page's Content
/// Security Policy (`default-src 'self'`) because every sub-resource is
/// loaded from the same `app://localhost` origin.
final class BundleSchemeHandler: NSObject, WKURLSchemeHandler {

    func webView(_ webView: WKWebView,
                 start urlSchemeTask: any WKURLSchemeTask) {

        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(SchemeError.invalidURL)
            return
        }

        // Strip leading "/" so "app://localhost/index.html" → "index.html"
        let relativePath = String(url.path.dropFirst())

        // Resolve inside the bundled WebApp folder.
        guard let fileURL = Bundle.main.url(
            forResource: relativePath,
            withExtension: nil,
            subdirectory: "WebApp"
        ) else {
            urlSchemeTask.didFailWithError(SchemeError.fileNotFound(relativePath))
            return
        }

        guard let data = try? Data(contentsOf: fileURL) else {
            urlSchemeTask.didFailWithError(SchemeError.readFailed(relativePath))
            return
        }

        let mimeType = Self.mimeType(for: fileURL.pathExtension)

        let response = HTTPURLResponse(
            url: url,
            statusCode: 200,
            httpVersion: "HTTP/1.1",
            headerFields: [
                "Content-Type": mimeType,
                "Content-Length": "\(data.count)",
                "Cache-Control": "no-cache",
                // Allow cross-origin font loading (needed for font preload with crossorigin).
                "Access-Control-Allow-Origin": "*"
            ]
        )!

        urlSchemeTask.didReceive(response)
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView,
                 stop urlSchemeTask: any WKURLSchemeTask) {
        // Nothing to cancel — reads are synchronous from bundle.
    }

    // MARK: - MIME Type Mapping

    /// Returns the correct Content-Type for bundled assets.
    /// Covers every file type present in the web game.
    private static func mimeType(for ext: String) -> String {
        switch ext.lowercased() {
        case "html":          return "text/html; charset=utf-8"
        case "css":           return "text/css; charset=utf-8"
        case "js":            return "application/javascript; charset=utf-8"
        case "json":          return "application/json; charset=utf-8"
        case "png":           return "image/png"
        case "jpg", "jpeg":   return "image/jpeg"
        case "svg":           return "image/svg+xml"
        case "gif":           return "image/gif"
        case "webp":          return "image/webp"
        case "woff2":         return "font/woff2"
        case "woff":          return "font/woff"
        case "ttf":           return "font/ttf"
        case "webmanifest":   return "application/manifest+json"
        case "ico":           return "image/x-icon"
        default:              return "application/octet-stream"
        }
    }

    // MARK: - Errors

    private enum SchemeError: Error, LocalizedError {
        case invalidURL
        case fileNotFound(String)
        case readFailed(String)

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "BundleSchemeHandler: invalid URL"
            case .fileNotFound(let path):
                return "BundleSchemeHandler: file not found – \(path)"
            case .readFailed(let path):
                return "BundleSchemeHandler: could not read – \(path)"
            }
        }
    }
}
