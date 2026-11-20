"""Per-frame RMBG-1.4 masks for raw clips -> build/masks/<clip>.npy (uint8, N x h x w)."""
import sys, os, subprocess, numpy as np, cv2, onnxruntime as ort
model, *clips = sys.argv[1:]
os.makedirs("build/masks", exist_ok=True)
so = ort.SessionOptions(); so.intra_op_num_threads = 4
sess = ort.InferenceSession(model, so, providers=["CPUExecutionProvider"])
inp = sess.get_inputs()[0].name
for c in clips:
    out = f"build/masks/{c}.npy"
    if os.path.exists(out): continue
    w, h = map(int, subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v", "-show_entries",
               "stream=width,height", "-of", "csv=p=0", f"raw/{c}.mp4"]).decode().strip().split(","))
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", f"raw/{c}.mp4", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"])
    fr = np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)
    ms = []
    for f in fr:
        x = (cv2.resize(f, (1024, 1024)).astype(np.float32) / 255 - 0.5).transpose(2, 0, 1)[None]
        m = sess.run(None, {inp: x})[0][0, 0]
        m = (m - m.min()) / (m.max() - m.min() + 1e-6)
        ms.append((cv2.resize(m, (w, h)) * 255).astype(np.uint8))
    np.save(out, np.stack(ms)); print(c, len(ms), flush=True)
