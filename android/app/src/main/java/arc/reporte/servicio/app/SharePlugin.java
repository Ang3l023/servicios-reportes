package arc.reporte.servicio.app;

import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "ShareReceiver")
public class SharePlugin extends Plugin {

    private static final String PREFS = "share_prefs";
    private static final String KEY_IMAGES = "pending_shared_images";

    @PluginMethod
    public void getPendingImages(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
        String json = prefs.getString(KEY_IMAGES, "[]");

        JSObject ret = new JSObject();
        ret.put("imagesJson", json);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearPendingImages(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_IMAGES).apply();
        call.resolve();
    }
}
