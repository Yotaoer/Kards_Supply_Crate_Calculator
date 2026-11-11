package com.yotaoer.kardssupply;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.util.Collections;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (bridge == null) return;
        Uri localOrigin = Uri.parse(bridge.getAppUrl());
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                boolean http = "https".equals(url.getScheme()) || "http".equals(url.getScheme());
                boolean local = localOrigin.getScheme().equals(url.getScheme()) && localOrigin.getHost().equals(url.getHost());
                if (http && !local) {
                    return new WebResourceResponse("text/plain", "UTF-8", 403, "Offline application",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
                }
                return super.shouldInterceptRequest(view, request);
            }
        });
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView view = bridge.getWebView();
                view.evaluateJavascript(
                    "(function(){var d=document.querySelector('dialog[open]');if(d){d.close('cancel');return true;}return false;})()",
                    handled -> {
                        if ("true".equals(handled)) return;
                        if (view.canGoBack()) view.goBack();
                        else finish();
                    });
            }
        });
    }
}
