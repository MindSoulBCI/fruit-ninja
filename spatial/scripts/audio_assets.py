"""Offline PCM rendering of src/game.js WebAudio envelopes (no external audio)."""
from pathlib import Path
import math, random, struct, wave
RATE=44100
out=Path('app/src/main/assets/audio');out.mkdir(parents=True,exist_ok=True)
def render(name, tones=(), noises=()):
    buf=[0.0]*int(RATE*.9)
    for hz,duration,shape,volume,end,delay in tones:
        phase=0
        for i in range(int(duration*RATE)):
            t=i/RATE; f=hz*(end/hz)**(t/duration);phase+=f/RATE
            s=math.sin(phase*math.tau) if shape=='sine' else (2/math.pi*math.asin(math.sin(phase*math.tau)) if shape=='triangle' else 2*(phase%1)-1)
            env=.001+(volume-.001)*t/.006 if t<.006 else volume*(.001/volume)**((t-.006)/max(.001,duration-.006))
            buf[i+int(delay*RATE)]+=s*env
    for duration,volume,cutoff in noises:
        rng=random.Random(7139); y=0;alpha=1-math.exp(-math.tau*cutoff/RATE)
        for i in range(int(duration*RATE)):
            t=i/RATE;y+=alpha*(rng.uniform(-1,1)-y)
            env=.001+(volume-.001)*t/.004 if t<.004 else volume*(.001/volume)**((t-.004)/(duration-.004))
            buf[i]+=y*env
    end=max([d+delay+.02 for _,d,_,_,_,delay in tones]+[d+.02 for d,_,_ in noises]+[.1])
    with wave.open(str(out/(name+'.wav')),'wb') as w:
        w.setnchannels(1);w.setsampwidth(2);w.setframerate(RATE)
        w.writeframes(b''.join(struct.pack('<h',int(math.tanh(v*2)*28000)) for v in buf[:int(end*RATE)]))
for k,pitch in [(0,190),(1,220),(2,150),(4,265),(5,310),(6,245)]:
    render('slice'+str(k),[(pitch,.13,'sine',.14,pitch*.43,0),(625,.065,'triangle',.035,920,.018)],[(.11,.15,3380)])
render('bomb',[(100,.45,'sawtooth',.09,25,0)],[(.55,.3,800)])
render('combo',[(523,.22,'triangle',.07,523,0),(659,.25,'triangle',.055,659,.035),(784,.32,'triangle',.045,784,.07)])
render('miss',[(660,.12,'triangle',.15,510,0),(440,.2,'triangle',.14,290,.13)],[(.12,.055,1400)])
render('start',[(440,.12,'sine',.07,440,0),(880,.22,'triangle',.06,880,.15)])
render('whoosh',[],[(.09,.065,2600)])
print('Generated',len(list(out.glob('*.wav'))),'PCM effects')
