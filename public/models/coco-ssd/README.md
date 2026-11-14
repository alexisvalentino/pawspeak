# PawSpeak pet detection model

This folder contains the inference artifact used for common COCO object detection. It is the TensorFlow.js COCO-SSD `lite_mobilenet_v2` model, copied from Google's TensorFlow.js model host so PawSpeak can work offline after installation. Animal classes in this model are bird, cat, dog, horse, sheep, cow, elephant, bear, zebra, and giraffe. Its labels and confidence scores describe object detections; they do not classify posture, emotion, or intent.

- Model JSON and weight shards: <https://storage.googleapis.com/tfjs-models/savedmodel/ssdlite_mobilenet_v2/>
- TensorFlow.js COCO-SSD package and Apache-2.0 license: <https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd>
- COCO dataset information: <https://cocodataset.org/>

The training dataset is not included. The camera runs this model locally and treats its output as pet detection only; it does not classify posture, emotion, or intent.
