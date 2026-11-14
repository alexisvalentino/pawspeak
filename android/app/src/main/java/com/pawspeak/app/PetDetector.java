package com.pawspeak.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.RectF;

import org.tensorflow.lite.support.image.ImageProcessor;
import org.tensorflow.lite.support.image.TensorImage;
import org.tensorflow.lite.support.image.ops.Rot90Op;
import org.tensorflow.lite.task.core.BaseOptions;
import org.tensorflow.lite.task.vision.detector.Detection;
import org.tensorflow.lite.task.vision.detector.ObjectDetector;

import java.io.Closeable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

/**
 * On-device pet detection using a bundled TFLite EfficientDet-Lite0 model.
 *
 * This exists because running TensorFlow.js inside a WebView could not hold a WebGL
 * context across frames: COCO-SSD switches the tfjs backend to CPU and back on every
 * single inference, which reliably kills mobile GPU contexts after the first frame.
 * Here the model runs natively and its inference context is created once.
 */
final class PetDetector implements Closeable {

    /**
     * Animal labels emitted by the COCO-trained EfficientDet-Lite model. The page owns
     * the pet/other-object split so it can keep its "I spotted a chair" fallback copy.
     */
    static final List<String> ANIMAL_LABELS = Collections.unmodifiableList(Arrays.asList(
            "dog", "cat", "bird", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe"));

    private static final String MODEL_ASSET = "pet-detector/efficientdet_lite2.tflite";
    private static final int MAX_RESULTS = 8;
    private static final float MIN_SCORE = 0.40f;

    private final ObjectDetector detector;
    private final ReentrantLock inferenceLock = new ReentrantLock();

    private PetDetector(ObjectDetector detector) {
        this.detector = detector;
    }

    static PetDetector create(Context context, int threads) throws IOException {
        BaseOptions.Builder base = BaseOptions.builder();
        if (threads > 0) base.setNumThreads(threads);
        ObjectDetector.ObjectDetectorOptions options = ObjectDetector.ObjectDetectorOptions.builder()
                .setBaseOptions(base.build())
                .setMaxResults(MAX_RESULTS)
                .setScoreThreshold(MIN_SCORE)
                .build();
        return new PetDetector(ObjectDetector.createFromFileAndOptions(context, MODEL_ASSET, options));
    }

    /** One detection in source-image pixel coordinates. */
    static final class PetBox {
        final String label;
        final float confidence;
        final float left;
        final float top;
        final float width;
        final float height;

        PetBox(String label, float confidence, float left, float top, float width, float height) {
            this.label = label;
            this.confidence = confidence;
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
        }
    }

    /** All detections in the frame, highest confidence first. */
    List<PetBox> detect(Bitmap bitmap) {
        inferenceLock.lock();
        try {
            ImageProcessor processor = new ImageProcessor.Builder().add(new Rot90Op(0)).build();
            TensorImage image = processor.process(TensorImage.fromBitmap(bitmap));
            List<Detection> results = detector.detect(image);
            List<PetBox> detections = new ArrayList<>(results.size());
            for (Detection detection : results) {
                for (org.tensorflow.lite.support.label.Category category : detection.getCategories()) {
                    RectF box = detection.getBoundingBox();
                    detections.add(new PetBox(category.getLabel(), category.getScore(),
                            box.left, box.top, box.width(), box.height()));
                    // One box per detection: the top category is the model's answer.
                    break;
                }
            }
            detections.sort(Comparator.comparingDouble((PetBox box) -> box.confidence).reversed());
            return detections;
        } finally {
            inferenceLock.unlock();
        }
    }

    /** Plain software bitmap, so decoding never depends on hardware-bitmap support. */
    static Bitmap softwareBitmap(int width, int height) {
        return Bitmap.createBitmap(Math.max(1, width), Math.max(1, height), Bitmap.Config.ARGB_8888);
    }

    @Override
    public void close() {
        inferenceLock.lock();
        try {
            detector.close();
        } finally {
            inferenceLock.unlock();
        }
    }
}
