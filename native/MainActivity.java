package com.layalina.game;

import android.os.Bundle;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

/**
 * يلتقط أزرار يد التحكم والريموت وعصي التحكم على مستوى النظام ويمررها للعبة،
 * لأن Gamepad API داخل WebView غير موثوق على Android TV.
 */
public class MainActivity extends BridgeActivity {
    private final float[] last = new float[10];

    public class NativeBridge {
        @JavascriptInterface
        public void exit() {
            runOnUiThread(() -> finishAffinity());
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystem();
        WebView wv = getBridge().getWebView();
        wv.getSettings().setMediaPlaybackRequiresUserGesture(false);
        wv.addJavascriptInterface(new NativeBridge(), "NativeBridge");
    }

    private void hideSystem() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystem();
    }

    private void js(final String code) {
        final WebView w = getBridge().getWebView();
        w.post(() -> w.evaluateJavascript(code, null));
    }

    private boolean isGameKey(int kc) {
        return KeyEvent.isGamepadButton(kc)
                || (kc >= KeyEvent.KEYCODE_DPAD_UP && kc <= KeyEvent.KEYCODE_DPAD_CENTER)
                || kc == KeyEvent.KEYCODE_ENTER
                || kc == KeyEvent.KEYCODE_NUMPAD_ENTER
                || kc == KeyEvent.KEYCODE_BACK
                || kc == KeyEvent.KEYCODE_MENU
                || kc == KeyEvent.KEYCODE_ESCAPE
                || kc == KeyEvent.KEYCODE_BUTTON_MODE;
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int kc = e.getKeyCode();
        if (isGameKey(kc)) {
            int a = e.getAction();
            if (a == KeyEvent.ACTION_DOWN && e.getRepeatCount() > 0) return true;
            if (a == KeyEvent.ACTION_DOWN || a == KeyEvent.ACTION_UP) {
                js("window.__nk&&window.__nk(" + kc + "," + (a == KeyEvent.ACTION_DOWN ? 1 : 0) + ")");
            }
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent e) {
        if ((e.getSource() & InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK
                && e.getAction() == MotionEvent.ACTION_MOVE) {
            float[] v = {
                    e.getAxisValue(MotionEvent.AXIS_X),
                    e.getAxisValue(MotionEvent.AXIS_Y),
                    e.getAxisValue(MotionEvent.AXIS_Z),
                    e.getAxisValue(MotionEvent.AXIS_RZ),
                    e.getAxisValue(MotionEvent.AXIS_RX),
                    e.getAxisValue(MotionEvent.AXIS_RY),
                    Math.max(e.getAxisValue(MotionEvent.AXIS_LTRIGGER), e.getAxisValue(MotionEvent.AXIS_BRAKE)),
                    Math.max(e.getAxisValue(MotionEvent.AXIS_RTRIGGER), e.getAxisValue(MotionEvent.AXIS_GAS)),
                    e.getAxisValue(MotionEvent.AXIS_HAT_X),
                    e.getAxisValue(MotionEvent.AXIS_HAT_Y)
            };
            boolean changed = false;
            for (int i = 0; i < v.length; i++) {
                if (Math.abs(v[i] - last[i]) > 0.01f) changed = true;
            }
            if (changed) {
                StringBuilder sb = new StringBuilder("window.__na&&window.__na(");
                for (int i = 0; i < v.length; i++) {
                    last[i] = v[i];
                    if (i > 0) sb.append(',');
                    sb.append(v[i]);
                }
                sb.append(')');
                js(sb.toString());
            }
            return true;
        }
        return super.dispatchGenericMotionEvent(e);
    }
}
