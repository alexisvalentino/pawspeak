package com.pawspeak.app;

import android.graphics.Bitmap;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * Exposes native pet detection to the web layer.
 *
 * The page hands over one JPEG frame at a time and gets detections back. Inference
 * happens on-device in the app process; no frame is uploaded or persisted.
 */
@CapacitorPlugin(name = "PetDetector")
public class PetDetectorPlugin extends Plugin {

    private static final int DETECTOR_THREADS = 4;

    private PetDetector detector;
    private boolean unavailable;

    @Override
    public void load() {
        try {
            detector = PetDetector.create(getContext(), DETECTOR_THREADS);
        } catch (Throwable error) {
            // Report a usable error instead of crashing the WebView; the page falls back.
            unavailable = true;
            detector = null;
        }
    }

    /** Whether native detection is ready, so the page can decide between native and WebGL. */
    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", detector != null && !unavailable);
        call.resolve(result);
    }

    /**
     * Detect animals in one base64 JPEG frame.
     * Expects { image: "<base64 jpeg>", width?: int, height?: int }.
     */
    @PluginMethod
    public void detect(PluginCall call) {
        String encoded = call.getString("image");
        if (encoded == null || encoded.isEmpty()) {
            call.reject("A camera frame is required.");
            return;
        }
        if (detector == null || unavailable) {
            call.reject("The on-device detector is not available on this device.");
            return;
        }

        Bitmap bitmap;
        try {
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            android.graphics.BitmapFactory.Options options = new android.graphics.BitmapFactory.Options();
            options.inPreferredConfig = Bitmap.Config.ARGB_8888;
            bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.length, options);
        } catch (Exception error) {
            call.reject("That camera frame could not be decoded.", error);
            return;
        }
        if (bitmap == null) {
            call.reject("That camera frame could not be decoded.");
            return;
        }

        // Keep inference off the bridge thread so the camera preview stays smooth.
        new Thread(() -> {
            try {
                List<PetDetector.PetBox> boxes = detector.detect(bitmap);
                JSArray detections = new JSArray();
                for (PetDetector.PetBox box : boxes) {
                    JSObject item = new JSObject();
                    item.put("label", box.label);
                    item.put("confidence", box.confidence);
                    JSArray bbox = new JSArray();
                    bbox.put(box.left);
                    bbox.put(box.top);
                    bbox.put(box.width);
                    bbox.put(box.height);
                    item.put("bbox", bbox);
                    detections.put(item);
                }
                JSObject result = new JSObject();
                result.put("detections", detections);
                call.resolve(result);
            } catch (Exception error) {
                call.reject("On-device detection failed: " + error.getMessage(), error);
            } finally {
                bitmap.recycle();
            }
        }, "pawspeak-detector").start();
    }

    @Override
    protected void handleOnDestroy() {
        if (detector != null) {
            detector.close();
            detector = null;
        }
        super.handleOnDestroy();
    }
}
