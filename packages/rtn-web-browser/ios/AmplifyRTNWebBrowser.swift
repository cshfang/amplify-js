// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Foundation
import AuthenticationServices

private class PresentationContextProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return ASPresentationAnchor()
    }
}

@objc(AmplifyRTNWebBrowser)
class AmplifyRTNWebBrowser: NSObject {
    var webBrowserAuthSession: ASWebAuthenticationSession?
    private let presentationContextProvider = PresentationContextProvider()
    
    private func isUrlValid(url: URL) -> Bool {
        return url.scheme == "http" || url.scheme == "https"
    }
    
    @objc
    func openAuthSessionAsync(_ urlStr: String,
                              resolve: @escaping RCTPromiseResolveBlock,
                              reject: @escaping RCTPromiseRejectBlock) {
        guard let url = URL(string: urlStr) else {
            reject("ERROR", "provided url is invalid", nil)
            return
        }
        
        guard isUrlValid(url: url) else {
            reject("ERROR", "provided url is invalid", nil)
            return
        }
        
        let authSession = ASWebAuthenticationSession(
            url: url,
            callbackURLScheme: nil,
            completionHandler: { url, error in
                if (error as? ASWebAuthenticationSessionError)?.code == .canceledLogin {
                    reject("ERROR", "user canceled auth session", error)
                    return
                }
                if error != nil {
                    reject("ERROR", "error occurred starting auth session", error)
                    return
                }
                resolve(url?.absoluteString)
            })
        webBrowserAuthSession = authSession
        authSession.presentationContextProvider = presentationContextProvider
        authSession.prefersEphemeralWebBrowserSession = true
        
        DispatchQueue.main.async {
            authSession.start()
        }
    }
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
