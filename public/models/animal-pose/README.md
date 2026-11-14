# RTMPose Animal AP-10K LiteRT

- File: `rtm_animal_fp16.tflite`
- Source: https://huggingface.co/litert-community/RTMPose-Animal-AP10K-LiteRT
- Model card license: Apache-2.0
- Model family/data: RTMPose trained on AP-10K animal-pose annotations
- Input: centered square crop, RGB, 256 × 256, NCHW, channel-wise AP-10K mean/std normalization
- Outputs: SimCC x/y coordinates for 17 AP-10K landmarks
- Model SHA-256: `7FBFC03239CEBC1F657EFAB722849BC9B30D36D3D4371118AED2AAF4041E742F`

This is a pose landmark model. PawSpeak derives only limited geometric posture signals from its landmarks. It does not predict emotion, health, or intent. The AP-10K skeleton has no ear-tip or tail-tip landmarks, and its pose rules deliberately return unclear for incomplete or oblique poses.
