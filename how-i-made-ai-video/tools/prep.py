# Builds data.js: corrected Bulgarian subtitles aligned to ASR word timings + mouth envelope.
import json, sys, subprocess, numpy as np
asr = json.load(open('tools/asr_transcript.json'))
FIX = [
 "Искаш да създаваш подобни AI видеа, без да плащаш за скъпи видеогенератори?",
 "Ще ти покажа точно как го направих аз.",
 "И най-хубавото?",
 "Можеш да започнеш напълно безплатно!",
 "Първа стъпка!",
 "Всичко започва с една идея.",
 "Отваряш ChatGPT или друг AI асистент, но не Claude.",
 "Защо?",
 "Защото няма смисъл да хабиш ценните си Claude токени в безкрайни разговори.",
 "Обясняваш какво видео искаш да създадеш,",
 "прикачваш референтно видео, което показва желания стил,",
 "и молиш AI да ти подготви цялостен, подробен промпт.",
 "Втора стъпка!",
 "Време е за гласа!",
 "Отново използваш същия AI, за да ти напише voiceover скрипт с емоции и инструкции за изговаряне.",
 "След това го поставяш в ElevenLabs.",
 "И да, има безплатен план, поддържащ доста езици, включително български.",
 "Генерираш гласа и изтегляш готовия MP3 файл.",
 "И сега идва най-интересната част!",
 "Трета стъпка!",
 "Отваряш Claude или Claude Code и прикачваш три неща:",
 "референтното видео, готовия аудиозапис и подробния промпт.",
 "Даваш инструкциите и оставяш Claude да изгради видеото чрез код, анимации, движения, субтитри и ефекти.",
 "Идеята ти постепенно се превръща в истинско анимирано видео.",
 "И всичко това може да се направи с безплатни инструменти и наличните безплатни планове,",
 "стига да се съобразиш с техните ограничения.",
 "Виждаш ли?",
 "Не е нужно да си програмист, дизайнер или технологичен гений, за да създаваш подобни неща.",
 "Искаш ли още такива AI трикове и уроци?",
 "Последвай ме и запази това видео, защото ще ти потрябва.",
 "А сега… какво ли ще създадем следващия път?",
]
assert len(FIX) == len(asr)
MAXC = 24
subs = []
for seg, txt in zip(asr, FIX):
    aw = seg['words']; cw = txt.split()
    n, m = len(aw), len(cw)
    words = []
    for i, w in enumerate(cw):
        j = round(i * (n - 1) / max(m - 1, 1)) if m > 1 else 0
        words.append({'w': w, 's': round(aw[j]['s'], 2)})
    for i, w in enumerate(words):
        w['e'] = words[i + 1]['s'] if i + 1 < m else round(seg['end'], 2)
    # chunk
    chunk = []
    def flush():
        if chunk: subs.append({'s': chunk[0]['s'], 'e': chunk[-1]['e'], 'words': list(chunk)}); chunk.clear()
    for k, w in enumerate(words):
        L = sum(len(x['w']) + 1 for x in chunk)
        last = k == len(words) - 1
        if chunk and L + len(w['w']) > MAXC and not (last and len(w['w']) <= 10 and L + len(w['w']) <= 32): flush()
        chunk.append(w)
        if w['w'][-1] in ',.!?:' and sum(len(x['w']) + 1 for x in chunk) > 12: flush()
    flush()
for i, c in enumerate(subs):  # hold until next chunk if gap small
    nxt = subs[i + 1]['s'] if i + 1 < len(subs) else c['e'] + 0.6
    c['e'] = round(min(nxt, c['e'] + 0.45), 2)
# mouth envelope at 30 fps
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', 'assets/voiceover.mp3', '-ac', '1', '-ar', '24000', '-f', 's16le', '-'], capture_output=True).stdout
a = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
hop = 800
rms = np.array([np.sqrt(np.mean(a[i:i + hop * 2] ** 2)) for i in range(0, len(a), hop)])
env = np.clip((rms - 0.012) / 0.09, 0, 1) ** 0.7
env = np.convolve(env, [0.25, 0.5, 0.25], 'same')
dur = len(a) / 24000
open('data.js', 'w').write('window.SUBS=' + json.dumps(subs, ensure_ascii=False) + ';\nwindow.ENV=' + json.dumps([round(float(x), 3) for x in env]) + ';\nwindow.VO_DUR=' + str(round(dur, 3)) + ';\n')
print(len(subs), 'chunks; dur', dur)
for c in subs: print(f"{c['s']:6.2f}-{c['e']:6.2f}", ' '.join(w['w'] for w in c['words']))
