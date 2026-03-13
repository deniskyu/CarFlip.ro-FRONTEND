import Firebase
import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()
    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "mobilefrontendframe",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }

  // --- MAGIA STRIPE FĂRĂ BRIDGING HEADER ---
  func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    // Căutăm RCTLinkingManager "pe întuneric" în memorie
    if let linkingManager = NSClassFromString("RCTLinkingManager") as? NSObject.Type {
        let selector = NSSelectorFromString("application:openURL:options:")
        if linkingManager.responds(to: selector) {
            // Transformăm memoria într-o funcție reală de C ca să înghită toți cei 3 parametri
            typealias RCTLinkingMethod = @convention(c) (AnyObject, Selector, UIApplication, URL, [UIApplication.OpenURLOptionsKey : Any]) -> Bool
            let imp = linkingManager.method(for: selector)
            let method = unsafeBitCast(imp, to: RCTLinkingMethod.self)
            
            // Trimitem link-ul de la Stripe mai departe
            return method(linkingManager, selector, app, url, options)
        }
    }
    return false
  }
  // -----------------------------------------
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}