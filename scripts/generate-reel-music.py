"""Generate original, looping instrumental beds; no external recordings or samples."""
import math
import struct
import wave
from pathlib import Path

RATE = 22050
ROOT = Path(__file__).resolve().parents[1] / 'client' / 'public' / 'audio'
THEMES = {
    'health': (96, [[60,64,67],[67,71,74],[69,72,76],[65,69,72]], [0,2,1,2,0,1,2,1], .8),
    'wealth': (80, [[57,60,64],[65,69,72],[60,64,67],[67,71,74]], [0,1,2,1,0,2,1,2], .55),
    'relationships': (72, [[60,64,67],[57,60,64],[65,69,72],[67,71,74]], [2,1,0,1,2,0,1,0], .4),
}

def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)

for name, (tempo, chords, melody, energy) in THEMES.items():
    beat = 60 / tempo
    duration = 16 * beat
    samples = [0.0] * round(duration * RATE)
    # Each chord and plucked note decays fully before the loop boundary.
    for bar, chord in enumerate(chords):
        start = bar * 4 * beat
        length = 3.8 * beat
        for i in range(round(length * RATE)):
            t = i / RATE
            envelope = min(1, t / .12) * (1 - t / length) ** 1.5
            pad = sum(math.sin(2 * math.pi * frequency(note) * t) for note in chord) / 3
            bass = math.sin(2 * math.pi * frequency(chord[0] - 24) * t)
            samples[round(start * RATE) + i] += envelope * (.11 * pad + .055 * bass)
        for step in range(8):
            note = chord[melody[(step + bar) % len(melody)]] + 12
            start_note = start + step * beat / 2
            length_note = min(beat * .46, duration - start_note)
            for i in range(round(length_note * RATE)):
                t = i / RATE
                envelope = min(1, t / .008) * math.exp(-t * 9) * (1 - t / length_note)
                f = frequency(note)
                tone = math.sin(2 * math.pi * f * t) + .22 * math.sin(4 * math.pi * f * t)
                samples[round(start_note * RATE) + i] += tone * envelope * .14 * energy
    # A short boundary fade prevents clicks when the soundtrack loops.
    edge = round(.03 * RATE)
    for i in range(edge):
        samples[i] *= i / edge
        samples[-i-1] *= i / edge
    ROOT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(ROOT / f'monthly-{name}.wav'), 'wb') as audio:
        audio.setnchannels(1)
        audio.setsampwidth(2)
        audio.setframerate(RATE)
        audio.writeframes(b''.join(struct.pack('<h', int(max(-1, min(1, sample)) * 32767)) for sample in samples))
