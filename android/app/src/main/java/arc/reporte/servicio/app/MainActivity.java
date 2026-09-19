package arc.reporte.servicio.app;

import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import org.json.JSONArray;

public class MainActivity extends BridgeActivity {

    private static final String PREFS = "share_prefs";
    private static final String KEY_IMAGES = "pending_shared_images";
    private static final String TAG = "ShareIntent";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SharePlugin.class);
        super.onCreate(savedInstanceState);
        handleShareIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleShareIntent(intent);
    }

    private void handleShareIntent(Intent intent) {
        if (intent == null) return;

        String action = intent.getAction();
        if (action == null) return;

        if (!Intent.ACTION_SEND.equals(action) && !Intent.ACTION_SEND_MULTIPLE.equals(action)) {
            return;
        }

        try {
            // Permisos de lectura del Uri (importante en OEM)
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            ArrayList<String> base64List = new ArrayList<>();

            if (Intent.ACTION_SEND.equals(action)) {
                Uri uri = intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (uri != null) {
                    grantUri(uri);
                    String b64 = uriToBase64(uri);
                    if (b64 != null) base64List.add(b64);
                }
            } else {
                ArrayList<Uri> uris = intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if (uris != null) {
                    for (Uri uri : uris) {
                        if (uri == null) continue;
                        grantUri(uri);
                        String b64 = uriToBase64(uri);
                        if (b64 != null) base64List.add(b64);
                    }
                }
            }

            Log.d(TAG, "Imágenes recibidas: " + base64List.size());

            if (base64List.isEmpty()) return;

            // Guardar en SharedPreferences (persiste aunque la WebView no esté lista)
            JSONArray arr = new JSONArray();
            for (String s : base64List) arr.put(s);

            SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
            prefs.edit().putString(KEY_IMAGES, arr.toString()).apply();

            // Intentar avisar a JS varias veces (Honor/Motorola van lentos)
            notifyJavaScriptWithRetry(0);

        } catch (Exception e) {
            Log.e(TAG, "Error handleShareIntent", e);
        }
    }

    private void grantUri(Uri uri) {
        try {
            getContentResolver().takePersistableUriPermission(
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        } catch (Exception ignored) {
            // Algunos providers no permiten persistable; no es fatal
        }
    }

    private void notifyJavaScriptWithRetry(int attempt) {
        if (attempt > 10) return;

        long delay = 500L * (attempt + 1); // 0.5s, 1s, 1.5s...

        getBridge().getWebView().postDelayed(() -> {
            try {
                getBridge().getWebView().evaluateJavascript(
                    "(function(){" +
                    "  window.dispatchEvent(new Event('checkSharedImages'));" +
                    "})();",
                    null
                );
            } catch (Exception e) {
                Log.e(TAG, "notify JS attempt " + attempt, e);
            }
            notifyJavaScriptWithRetry(attempt + 1);
        }, delay);
    }

    private String uriToBase64(Uri uri) {
        InputStream is = null;
        try {
            is = getContentResolver().openInputStream(uri);
            if (is == null) {
                Log.e(TAG, "openInputStream null: " + uri);
                return null;
            }

            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] data = new byte[16384];
            int n;
            while ((n = is.read(data)) != -1) {
                buffer.write(data, 0, n);
            }

            byte[] bytes = buffer.toByteArray();
            if (bytes.length == 0) return null;

            // Límite ~8MB por imagen para no tumbar la WebView
            if (bytes.length > 8 * 1024 * 1024) {
                Log.w(TAG, "Imagen demasiado grande, se omite");
                return null;
            }

            return Base64.encodeToString(bytes, Base64.NO_WRAP);
        } catch (Exception e) {
            Log.e(TAG, "uriToBase64 error: " + uri, e);
            return null;
        } finally {
            try { if (is != null) is.close(); } catch (Exception ignored) {}
        }
    }
}
