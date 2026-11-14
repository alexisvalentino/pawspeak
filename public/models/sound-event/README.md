# YAMNet LiteRT sound-event model

- File: `yamnet.tflite`
- Source: [Google YAMNet LiteRT model on Kaggle](https://www.kaggle.com/models/google/yamnet/tfLite/tflite/1)
- License: Apache-2.0 (as listed on the Google model card)
- Training labels: 521 AudioSet sound-event classes
- Input: mono 16 kHz float waveform, normalized to `[-1, 1]`
- Output used by PawSpeak: frame-level 521-class sound-event scores
- Model SHA-256: `10C95EA3EB9A7BB4CB8BDDF6FEB023250381008177AC162CE169694D05C317DE`

PawSpeak requests a four-second microphone sample only after the user taps **Check nearby sounds**. Audio is resampled and classified in browser memory on the device, then discarded. The UI shows selected vocal-sound labels and the strongest window score. These general-purpose AudioSet scores are not calibrated probabilities, pet-specific cue judgments, or evidence of an animal's emotion, need, or intent. A low score does not prove no sound occurred.
