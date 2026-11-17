import SwiftUI
import UIKit
import WebKit

@main
struct GemSealApp: App {
    var body: some Scene {
        WindowGroup {
            GeometryReader { geometry in
                GameView(safeArea: geometry.safeAreaInsets)
                    .ignoresSafeArea()
            }
            .background(Color(red: 10.0 / 255, green: 16.0 / 255, blue: 38.0 / 255))
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
        webView.configuration.userContentController.add(context.coordinator, name: "gemSealHaptics")
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        if let page = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "Web") {
            context.coordinator.gameURL = page.standardizedFileURL
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

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "gemSealHaptics")
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var safeArea = EdgeInsets()
        var gameURL: URL?
        private let selection = UISelectionFeedbackGenerator()
        private let impact = UIImpactFeedbackGenerator(style: .soft)
        private let notification = UINotificationFeedbackGenerator()

        func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
            guard message.name == "gemSealHaptics", message.frameInfo.isMainFrame,
                  let gameURL, message.webView?.url?.standardizedFileURL == gameURL,
                  let kind = message.body as? String else { return }

            switch kind {
            case "selection": selection.selectionChanged()
            case "impact": impact.impactOccurred()
            case "success": notification.notificationOccurred(.success)
            case "warning": notification.notificationOccurred(.warning)
            default: break
            }
        }

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
