import SwiftUI
import WebKit

@main
struct GemSealApp: App {
    var body: some Scene {
        WindowGroup {
            ZStack {
                Color(red: 10.0 / 255, green: 16.0 / 255, blue: 38.0 / 255)
                    .ignoresSafeArea()
                GameView()
            }
            .preferredColorScheme(.dark)
        }
    }
}

private struct GameView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let webView = WKWebView()
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            webView.loadFileURL(page, allowingReadAccessTo: page.deletingLastPathComponent())
        } else {
            webView.loadHTMLString("<p>Gem Seal could not load its game files.</p>", baseURL: nil)
        }
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
