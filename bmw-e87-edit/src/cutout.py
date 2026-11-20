"""Background removal with RMBG-1.4 (ONNX). Writes <name>_rgba.png next to each input."""
import sys, numpy as np, cv2, onnxruntime as ort
model, out_dir, *imgs = sys.argv[1:]
sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0].name
for p in imgs:
    bgr = cv2.imread(p); h, w = bgr.shape[:2]
    x = cv2.resize(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB), (1024, 1024)).astype(np.float32) / 255.0
    x = (x - 0.5).transpose(2, 0, 1)[None]
    m = sess.run(None, {inp: x})[0][0, 0]
    m = (m - m.min()) / (m.max() - m.min() + 1e-6)
    m = cv2.resize(m, (w, h))
    a = (np.clip(m, 0, 1) * 255).astype(np.uint8)
    name = p.rsplit("/", 1)[-1].rsplit(".", 1)[0]
    cv2.imwrite(f"{out_dir}/{name}_rgba.png", np.dstack([bgr, a]))
    print(name, w, h)
