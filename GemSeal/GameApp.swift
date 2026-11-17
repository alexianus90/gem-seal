import SwiftUI
import WebKit

@main
struct GemSealApp: App {
    var body: some Scene {
        WindowGroup {
            GeometryReader { geometry in
                GameView(safeArea: geometry.safeAreaInsets)
                    .ignoresSafeArea()
            }
            .background(Color(red: 17.0 / 255, green: 29.0 / 255, blue: 40.0 / 255))
            .preferredColorScheme(.dark)
        }
    }
}

private struct GameView: UIViewRepresentable {
    let safeArea: EdgeInsets

    func makeCoordinator() -> Coordinator {
        Coordinator()
    }

    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        } else {
            webView.loadHTMLString("<p>Gem Seal could not load its game files.</p>", baseURL: nil)
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        let coordinator = context.coordinator
        guard coordinator.safeArea != safeArea else { return }
        coordinator.safeArea = safeArea
        coordinator.applySafeArea(to: webView)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        var safeArea = EdgeInsets()

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            applySafeArea(to: webView)
        }

        func applySafeArea(to webView: WKWebView) {
            webView.evaluateJavaScript("""
                document.documentElement?.style.setProperty('--native-safe-top', '\(Double(safeArea.top))px');
                document.documentElement?.style.setProperty('--native-safe-bottom', '\(Double(safeArea.bottom))px');
                """, completionHandler: nil)
        }
    }
}
