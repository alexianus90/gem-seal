import GoogleMobileAds
import StoreKit
import UserMessagingPlatform
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
            .background(Color(red: 19.0 / 255, green: 19.0 / 255, blue: 41.0 / 255).ignoresSafeArea())
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
        webView.configuration.userContentController.addScriptMessageHandler(
            context.coordinator, contentWorld: .page, name: "gemSealServices"
        )
        webView.alpha = 0
        webView.accessibilityElementsHidden = true
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        context.coordinator.safeArea = safeArea
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
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "gemSealServices", contentWorld: .page)
    }

    final class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler, WKScriptMessageHandlerWithReply {
        private let ads = GemSealAds()
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

        func userContentController(
            _ controller: WKUserContentController,
            didReceive message: WKScriptMessage,
            replyHandler: @escaping (Any?, String?) -> Void
        ) {
            guard message.name == "gemSealServices", message.frameInfo.isMainFrame,
                  let gameURL, message.webView?.url?.standardizedFileURL == gameURL,
                  let command = message.body as? String else {
                replyHandler(nil, "Invalid request")
                return
            }
            let root = message.webView?.window?.rootViewController
            Task { @MainActor in
                let result = await services(command, from: root)
                replyHandler(result, nil)
            }
        }

        @MainActor
        private func services(_ command: String, from root: UIViewController?) async -> String {
            switch command {
            case "version":
                return Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
            case "rescue", "adPrivacy":
                guard let root, root.presentedViewController == nil else { return "unavailable" }
                if command == "rescue" { return await ads.rescue(from: root) }
                return await ads.privacy(from: root)
            case "contact", "adReport", "terms", "privacy", "support":
                let address: String
                switch command {
                case "contact": address = "mailto:info@happyhandsbooks.com?subject=Gem%20Seal%20feedback"
                case "adReport": address = "mailto:info@happyhandsbooks.com?subject=Gem%20Seal%20ad%20report"
                case "terms": address = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
                case "privacy": address = Bundle.main.object(forInfoDictionaryKey: "GemSealPrivacyURL") as? String ?? ""
                default: address = Bundle.main.object(forInfoDictionaryKey: "GemSealSupportURL") as? String ?? ""
                }
                guard let url = URL(string: address), url.scheme == "https" || url.scheme == "mailto" else {
                    return "unavailable"
                }
                return await UIApplication.shared.open(url) ? "opened" : "unavailable"
            case "share":
                guard let root, root.presentedViewController == nil,
                      let address = Bundle.main.object(forInfoDictionaryKey: "GemSealStoreURL") as? String,
                      let url = URL(string: address), url.host == "apps.apple.com", url.scheme == "https" else {
                    return "unavailable"
                }
                root.present(UIActivityViewController(activityItems: [url], applicationActivities: nil), animated: true)
                return "opened"
            default: return "unavailable"
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard webView.alpha == 0 else { return }
            // The first visible frame should already have the saved progress, logo and safe-area layout.
            webView.callAsyncJavaScript("""
                \(safeAreaScript)
                const logo = document.querySelector('#home .seal-logo');
                await Promise.race([
                    (async () => {
                        if (logo) await logo.decode().catch(() => {});
                        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
                    })(),
                    new Promise(resolve => setTimeout(resolve, 350))
                ]);
                """, arguments: [:], in: nil, contentWorld: .page) { [weak self, weak webView] _ in
                    guard let self, let webView else { return }
                    self.reveal(webView)
                }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            reveal(webView)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            reveal(webView)
        }

        private func reveal(_ webView: WKWebView) {
            guard webView.alpha == 0 else { return }
            webView.accessibilityElementsHidden = false
            if UIAccessibility.isReduceMotionEnabled {
                webView.alpha = 1
            } else {
                UIView.animate(withDuration: 0.28, delay: 0, options: [.curveEaseOut, .allowUserInteraction]) {
                    webView.alpha = 1
                }
            }
        }

        func applySafeArea(to webView: WKWebView) {
            webView.evaluateJavaScript(safeAreaScript, completionHandler: nil)
        }

        private var safeAreaScript: String {
            """
                document.documentElement?.style.setProperty('--native-safe-top', '\(Double(safeArea.top))px');
                document.documentElement?.style.setProperty('--native-safe-bottom', '\(Double(safeArea.bottom))px');
            """
        }
    }
}

@MainActor
private final class GemSealAds: NSObject, FullScreenContentDelegate {
    private var busy = false
    private var consentUpdated = false
    private var sdkStarted = false
    private var activeAd: RewardedAd?
    private var rewardResult: CheckedContinuation<String, Never>?
    private var earnedReward = false

    func rescue(from presenter: UIViewController) async -> String {
        guard !busy else { return "unavailable" }
        busy = true
        defer { busy = false }
        guard let adUnit = await rewardedUnit() else { return "unavailable" }

        do {
            try await updateConsent()
            try await ConsentForm.loadAndPresentIfRequired(from: presenter)
            guard ConsentInformation.shared.canRequestAds else { return "consent" }
            if !sdkStarted {
                _ = await MobileAds.shared.start()
                sdkStarted = true
            }
            let ad = try await RewardedAd.load(with: adUnit, request: Request())
            try ad.canPresent(from: presenter)
            return await withCheckedContinuation { continuation in
                rewardResult = continuation
                earnedReward = false
                activeAd = ad
                ad.fullScreenContentDelegate = self
                ad.present(from: presenter) { [weak self] in self?.earnedReward = true }
            }
        } catch {
            return "unavailable"
        }
    }

    func privacy(from presenter: UIViewController) async -> String {
        guard !busy else { return "unavailable" }
        busy = true
        defer { busy = false }
        guard await rewardedUnit() != nil else { return "unavailable" }
        do {
            try await updateConsent()
            guard ConsentInformation.shared.privacyOptionsRequirementStatus == .required else {
                return "notRequired"
            }
            try await ConsentForm.presentPrivacyOptionsForm(from: presenter)
            return "opened"
        } catch {
            return "unavailable"
        }
    }

    private func updateConsent() async throws {
        guard !consentUpdated else { return }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            ConsentInformation.shared.requestConsentInfoUpdate(with: RequestParameters()) { error in
                if let error { continuation.resume(throwing: error) }
                else { continuation.resume() }
            }
        }
        consentUpdated = true
    }

    private func rewardedUnit() async -> String? {
#if DEBUG
        return "ca-app-pub-3940256099942544/1712485313"
#else
        guard let result = try? await AppTransaction.shared, case .verified(let transaction) = result else {
            return nil
        }
        if transaction.environment == .sandbox { return "ca-app-pub-3940256099942544/1712485313" }
        guard transaction.environment == .production,
              let app = Bundle.main.object(forInfoDictionaryKey: "GADApplicationIdentifier") as? String,
              let unit = Bundle.main.object(forInfoDictionaryKey: "GemSealRewardedAdUnitID") as? String,
              let separator = app.firstIndex(of: "~"), !app.hasPrefix("ca-app-pub-3940256099942544"),
              unit.hasPrefix(String(app[..<separator]) + "/") else { return nil }
        return unit
#endif
    }

    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) {
        finish(earnedReward ? "earned" : "skipped")
    }

    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) {
        finish("unavailable")
    }

    private func finish(_ result: String) {
        let continuation = rewardResult
        rewardResult = nil
        activeAd = nil
        continuation?.resume(returning: result)
    }
}
