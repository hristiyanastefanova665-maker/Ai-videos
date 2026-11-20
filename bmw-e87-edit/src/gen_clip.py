"""Generate one raw clip with the free Wan 2.2 I2V ZeroGPU space.
usage: gen_clip.py <image_url> <out.mp4> <seconds> <prompt>"""
import sys, shutil
from gradio_client import Client, handle_file
url, out, dur, prompt = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
# the real token is injected by the network proxy; this placeholder only makes the client send the header
c = Client("zerogpu-aoti/wan2-2-fp8da-aoti-faster", headers={"Authorization": "Bearer proxy-injected"}, verbose=False)
res = c.predict(input_image=handle_file(url), prompt=prompt, duration_seconds=dur, steps=6,
                negative_prompt="deformed car, extra wheels, warped logo, blurry text, static, morphing, distorted body",
                api_name="/generate_video")
vid = res[0]["video"] if isinstance(res[0], dict) else res[0]
shutil.copy(vid, out); print("saved", out, res[1])
