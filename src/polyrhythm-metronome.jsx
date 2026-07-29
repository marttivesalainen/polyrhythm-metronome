import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ *
 * Polyrhythm trainer
 * left hand plays `left` strikes per cycle, right hand plays `right`.
 * Grid is left*right columns, so a left strike lands every `right`
 * columns and a right strike every `left` columns. They meet at 0.
 * Tempo (bpm) is the left hand's pulse (60/bpm between left strikes).
 * ------------------------------------------------------------------ */

const CSS = `
/* Fonts are resolved from what the visitor already has installed.
   No external requests, so nothing leaves the page. */
.pr {
  --ground:#0C1113; --panel:#141C20; --rule:#22323A;
  --dim:#6E858E; --text:#DCE8EC;
  --left:#F2A03D; --right:#A98BF2; --both:#FFF6E8;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, "Cascadia Mono", "Segoe UI Mono",
          "Liberation Mono", "Roboto Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace;
  font-family:var(--mono);
  font-variant-numeric:tabular-nums;
  font-feature-settings:"tnum" 1;
  background:var(--ground); color:var(--text);
  min-height:100%; padding:22px 18px 30px; box-sizing:border-box;
  -webkit-font-smoothing:antialiased;
}
.pr *, .pr *::before, .pr *::after { box-sizing:border-box; }
.pr-wrap { max-width:820px; margin:0 auto; }

/* header */
.pr-head { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; }
.pr-ratio { font-size:clamp(52px,13vw,86px); font-weight:700; line-height:.86; letter-spacing:-.04em; }
.pr-ratio .l { color:var(--left); }
.pr-ratio .r { color:var(--right); }
.pr-ratio .c { color:var(--rule); }
.pr-sub { margin-top:8px; font-size:11px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
.pr-btn {
  font:inherit; font-size:12px; font-weight:500; letter-spacing:.2em; text-transform:uppercase;
  padding:14px 26px; border-radius:2px; cursor:pointer;
  background:transparent; color:var(--text); border:1px solid var(--rule);
  transition:background .15s, color .15s, border-color .15s;
}
.pr-btn:hover { border-color:var(--dim); }
.pr-btn.on { background:var(--text); color:var(--ground); border-color:var(--text); }
.pr-btn:focus-visible, .pr-num:focus-visible, .pr input:focus-visible {
  outline:2px solid var(--right); outline-offset:3px;
}

/* grid */
.pr-panel { margin-top:26px; background:var(--panel); border:1px solid var(--rule); border-radius:3px; padding:18px 16px 14px; }
.pr-grid { position:relative; }
.pr-row { display:grid; grid-template-columns:74px 1fr; align-items:center; height:34px; }
.pr-label { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--dim); }
.pr-row.b .pr-label { color:var(--left); }
.pr-row.c .pr-label { color:var(--right); }
.pr-cells { display:grid; gap:2px; align-items:center; height:100%; }
.pr-cell { display:flex; align-items:center; justify-content:center; }
.pr-dot { width:3px; height:3px; border-radius:50%; background:var(--rule); }
.pr-dot.hit {
  width:100%; max-width:13px; height:auto; aspect-ratio:1;
  background:currentColor; opacity:.42;
  transition:opacity .22s ease-out, transform .22s ease-out, box-shadow .22s ease-out;
}
.pr-row.b .pr-dot.hit { color:var(--left); }
.pr-row.c .pr-dot.hit { color:var(--right); }
.pr-dot.hit.now { opacity:1; transform:scale(1.5); box-shadow:0 0 14px currentColor; transition-duration:0s; }
.pr-dot.rest { transition:background .22s ease-out; }
.pr-dot.rest.now { background:var(--dim); transition-duration:0s; }

/* pulse ruler + playhead live over the cells area only */
.pr-overlay { position:absolute; left:74px; right:0; top:0; bottom:0; pointer-events:none; }
.pr-lines { position:absolute; inset:0; display:grid; gap:2px; }
.pr-lines i { border-left:1px solid transparent; }
.pr-lines i.beat { border-left-color:rgba(242,160,61,.14); }
.pr-head-line { position:absolute; top:-4px; bottom:-4px; width:1px; background:var(--both); opacity:.5; left:0; }

/* controls */
.pr-controls { margin-top:22px; display:grid; gap:20px; }
.pr-ctl-label { font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); margin-bottom:9px; display:flex; justify-content:space-between; gap:12px; }
.pr-ctl-label b { color:var(--text); font-weight:500; letter-spacing:.04em; text-transform:none; }
.pr input[type=range] { -webkit-appearance:none; appearance:none; width:100%; height:20px; background:transparent; cursor:pointer; }
.pr input[type=range]::-webkit-slider-runnable-track { height:1px; background:var(--rule); }
.pr input[type=range]::-moz-range-track { height:1px; background:var(--rule); }
.pr input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:12px; height:12px; margin-top:-6px; border-radius:50%; background:var(--text); }
.pr input[type=range]::-moz-range-thumb { width:12px; height:12px; border:0; border-radius:50%; background:var(--text); }
.pr-hands { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.pr-nums { display:flex; gap:5px; }
.pr-num {
  flex:1; font:inherit; font-size:13px; padding:9px 0; cursor:pointer;
  background:transparent; color:var(--dim); border:1px solid var(--rule); border-radius:2px;
  transition:color .15s, border-color .15s, background .15s;
}
.pr-num:hover { color:var(--text); }
.pr-num.sel { color:var(--ground); font-weight:700; }
.pr-hands .lh .pr-num.sel { background:var(--left); border-color:var(--left); }
.pr-hands .rh .pr-num.sel { background:var(--right); border-color:var(--right); }
.pr-switch { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.pr-switch-text { font-size:10px; letter-spacing:.16em; text-transform:uppercase; color:var(--dim); }
.pr-switch-text em { display:block; margin-top:5px; font-style:normal; letter-spacing:.02em; text-transform:none; font-size:11px; color:var(--rule); }
.pr-toggle {
  flex:none; width:52px; height:26px; padding:3px; cursor:pointer;
  background:transparent; border:1px solid var(--rule); border-radius:13px;
  display:flex; justify-content:flex-start; transition:background .18s, border-color .18s;
}
.pr-toggle span { width:18px; height:18px; border-radius:50%; background:var(--rule); transition:transform .18s ease, background .18s; }
.pr-toggle.on { border-color:var(--both); }
.pr-toggle.on span { background:var(--both); transform:translateX(26px); }
.pr-toggle:focus-visible { outline:2px solid var(--right); outline-offset:3px; }
.pr-foot { margin-top:20px; font-size:11px; color:var(--dim); line-height:1.7; }

@media (max-width:520px) {
  .pr-row { grid-template-columns:44px 1fr; height:30px; }
  .pr-overlay { left:44px; }
  .pr-label { font-size:9px; letter-spacing:.06em; }
  .pr-hands { grid-template-columns:1fr; }
}
@media (prefers-reduced-motion:reduce) {
  .pr-dot.hit, .pr-dot.hit.now { transition-duration:.05s; transform:none; box-shadow:none; }
  .pr-head-line { display:none; }
}
`;

const CHOICES = [2, 3, 4, 5, 6, 7];

// Silent looping WAV used to bypass the iOS mute switch. When any
// HTMLAudioElement is playing, iOS Safari uses the "Playback" audio session
// category which ignores the ringer/silent switch. Web Audio alone uses the
// "Ambient" category, which respects it — so a silent HTMLAudio alongside our
// Web Audio nodes lets the metronome be heard even when silent mode is on.
let silentAudioUrl = null;
function getSilentAudioUrl() {
	if (silentAudioUrl) return silentAudioUrl;
	if (typeof window === "undefined") return "";
	const sampleRate = 22050;
	const numSamples = Math.floor(sampleRate * 0.25); // 250 ms of silence
	const dataSize = numSamples * 2;
	const buf = new ArrayBuffer(44 + dataSize);
	const v = new DataView(buf);
	v.setUint32(0, 0x52494646, false); // "RIFF"
	v.setUint32(4, 36 + dataSize, true);
	v.setUint32(8, 0x57415645, false); // "WAVE"
	v.setUint32(12, 0x666d7420, false); // "fmt "
	v.setUint32(16, 16, true);
	v.setUint16(20, 1, true); // PCM
	v.setUint16(22, 1, true); // mono
	v.setUint32(24, sampleRate, true);
	v.setUint32(28, sampleRate * 2, true);
	v.setUint16(32, 2, true);
	v.setUint16(34, 16, true);
	v.setUint32(36, 0x64617461, false); // "data"
	v.setUint32(40, dataSize, true);
	silentAudioUrl = URL.createObjectURL(new Blob([buf], { type: "audio/wav" }));
	return silentAudioUrl;
}

// URL-shareable settings <-> component state
const DEFAULTS = { left: 5, right: 3, bpm: 80, volume: 0.8, subdiv: true };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const pickChoice = (n, fallback) => (CHOICES.includes(n) ? n : fallback);

function readSettingsFromURL() {
	if (typeof window === "undefined") return DEFAULTS;
	const q = new URLSearchParams(window.location.search);
	const num = (k) => (q.has(k) ? Number(q.get(k)) : NaN);
	const left = pickChoice(num("l"), DEFAULTS.left);
	const right = pickChoice(num("r"), DEFAULTS.right);
	const bpmRaw = num("bpm");
	const bpm = Number.isFinite(bpmRaw)
		? clamp(Math.round(bpmRaw), 20, 220)
		: DEFAULTS.bpm;
	const volRaw = num("v");
	const volume = Number.isFinite(volRaw)
		? clamp(volRaw, 0, 1)
		: DEFAULTS.volume;
	const subdiv = q.has("s") ? q.get("s") === "1" : DEFAULTS.subdiv;
	return { left, right, bpm, volume, subdiv };
}

function writeSettingsToURL({ left, right, bpm, volume, subdiv }) {
	if (typeof window === "undefined") return;
	const q = new URLSearchParams();
	if (left !== DEFAULTS.left) q.set("l", String(left));
	if (right !== DEFAULTS.right) q.set("r", String(right));
	if (bpm !== DEFAULTS.bpm) q.set("bpm", String(bpm));
	if (volume !== DEFAULTS.volume) q.set("v", volume.toFixed(2));
	if (subdiv !== DEFAULTS.subdiv) q.set("s", subdiv ? "1" : "0");
	const search = q.toString();
	const url =
		window.location.pathname +
		(search ? "?" + search : "") +
		window.location.hash;
	window.history.replaceState(null, "", url);
}

export default function PolyrhythmTrainer() {
	const initial = readSettingsFromURL();
	const [left, setLeft] = useState(initial.left);
	const [right, setRight] = useState(initial.right);
	const [bpm, setBpm] = useState(initial.bpm);
	const [volume, setVolume] = useState(initial.volume);
	const [subdiv, setSubdiv] = useState(initial.subdiv);
	const [playing, setPlaying] = useState(false);
	const [col, setCol] = useState(-1);

	const ctxRef = useRef(null);
	const masterRef = useRef(null);
	const silentAudioRef = useRef(null);
	const timerRef = useRef(null);
	const rafRef = useRef(null);
	const nextTimeRef = useRef(0);
	const colRef = useRef(0);
	const queueRef = useRef([]);
	const cycleStartRef = useRef(0);
	const headRef = useRef(null);
	const paramsRef = useRef({ left, right, bpm, subdiv });

	useEffect(() => {
		paramsRef.current = { left, right, bpm, subdiv };
	}, [left, right, bpm, subdiv]);

	// keep the URL in sync so the current setup is linkable
	useEffect(() => {
		writeSettingsToURL({ left, right, bpm, volume, subdiv });
	}, [left, right, bpm, volume, subdiv]);

	const cols = left * right;

	/* ---------------- audio ---------------- */

	const getCtx = () => {
		// iOS can put the context into "closed" state after a long background;
		// resume() won't recover that, so drop and rebuild.
		if (ctxRef.current && ctxRef.current.state === "closed") {
			ctxRef.current = null;
			masterRef.current = null;
		}
		if (!ctxRef.current) {
			const AC = window.AudioContext || window.webkitAudioContext;
			const ctx = new AC();
			const master = ctx.createGain();
			master.gain.value = volume;
			master.connect(ctx.destination);
			ctxRef.current = ctx;
			masterRef.current = master;
		}
		return ctxRef.current;
	};

	// Silent looping <audio> element: primed on the first Start (user gesture)
	// so that Safari flips the iOS audio session to "Playback" and our Web
	// Audio drums are audible when the ringer switch is off.
	const primeSilentAudio = () => {
		if (silentAudioRef.current) return;
		const el = new Audio(getSilentAudioUrl());
		el.loop = true;
		el.playsInline = true;
		el.preload = "auto";
		el.volume = 0;
		silentAudioRef.current = el;
	};

	useEffect(() => {
		if (masterRef.current) masterRef.current.gain.value = volume;
	}, [volume]);

	const tone = (
		t,
		{ freq, type, dur, gain, drop, detune = 0, attack = 0.003 },
	) => {
		const ctx = ctxRef.current;
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (detune) o.detune.setValueAtTime(detune, t);
		if (drop) o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(gain, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(masterRef.current);
		o.start(t);
		o.stop(t + dur + 0.03);
	};

	// short white-noise burst pushed through a bandpass, for snare crack / breath
	const noiseBurst = (
		t,
		{ dur, gain, freq, Q = 1, type = "bandpass", attack = 0.002 },
	) => {
		const ctx = ctxRef.current;
		const frames = Math.max(1, Math.floor(ctx.sampleRate * dur));
		const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
		const data = buf.getChannelData(0);
		for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
		const src = ctx.createBufferSource();
		src.buffer = buf;
		const filt = ctx.createBiquadFilter();
		filt.type = type;
		filt.frequency.setValueAtTime(freq, t);
		filt.Q.value = Q;
		const g = ctx.createGain();
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(gain, t + attack);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		src.connect(filt);
		filt.connect(g);
		g.connect(masterRef.current);
		src.start(t);
		src.stop(t + dur + 0.02);
	};

	// ---- TR-808-style voices ----
	// Values follow the classic TR-808 topology as documented in the Roland
	// service notes and reproduced in many analog-drum synthesis references.

	// Closed hi-hat: six inharmonic square oscillators summed into a bandpass
	// (~10 kHz) then highpass (~7 kHz), fast VCA decay (~50 ms).
	// Original 808 metallic-oscillator frequencies:
	const HAT_FREQS = [205, 304, 369, 522, 540, 800];
	const hiHat808 = (t) => {
		const ctx = ctxRef.current;
		const bp = ctx.createBiquadFilter();
		bp.type = "bandpass";
		bp.frequency.value = 10000;
		bp.Q.value = 0.8;
		const hp = ctx.createBiquadFilter();
		hp.type = "highpass";
		hp.frequency.value = 7000;
		const g = ctx.createGain();
		const dur = 0.05;
		const peak = 0.14;
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(peak, t + 0.001);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		bp.connect(hp);
		hp.connect(g);
		g.connect(masterRef.current);
		for (const f of HAT_FREQS) {
			const o = ctx.createOscillator();
			o.type = "square";
			o.frequency.setValueAtTime(f, t);
			o.connect(bp);
			o.start(t);
			o.stop(t + dur + 0.02);
		}
	};

	// TR-808 bass drum: sine fundamental with a sharp pitch envelope
	// (~180 Hz -> ~55 Hz in ~50 ms), long exponential amplitude decay,
	// plus a short beater click transient.
	const kick808 = (t) => {
		const ctx = ctxRef.current;
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = "sine";
		o.frequency.setValueAtTime(180, t);
		o.frequency.exponentialRampToValueAtTime(55, t + 0.05);
		const peak = 0.85;
		const decay = 0.45;
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(peak, t + 0.002);
		g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
		o.connect(g);
		g.connect(masterRef.current);
		o.start(t);
		o.stop(t + decay + 0.05);
		// beater click — very short highpassed noise transient
		noiseBurst(t, {
			dur: 0.005,
			gain: 0.14,
			freq: 4000,
			Q: 0.7,
			type: "highpass",
			attack: 0.0005,
		});
	};

	// TR-808 snare: two "T-bridge" tone oscillators (185 Hz + 330 Hz triangles)
	// for the shell, and a bandpassed noise generator for the snappy wires.
	const snare808 = (t) => {
		// shell tones — real 808 uses ~30-80 ms decay on these
		tone(t, {
			freq: 330,
			type: "triangle",
			dur: 0.08,
			gain: 0.28,
			attack: 0.001,
		});
		tone(t, {
			freq: 185,
			type: "triangle",
			dur: 0.08,
			gain: 0.24,
			attack: 0.001,
		});
		// snappy noise — bandpass around the 808's "SNAPPY" tuning
		noiseBurst(t, {
			dur: 0.19,
			gain: 0.28,
			freq: 1800,
			Q: 0.6,
			type: "bandpass",
			attack: 0.002,
		});
		// upper snappy band, present but soft
		noiseBurst(t, {
			dur: 0.13,
			gain: 0.18,
			freq: 6500,
			Q: 0.5,
			type: "highpass",
			attack: 0.002,
		});
	};

	// tiny sine beep — very quiet marker for the "one" that adds no perceptible
	// weight to the hit, so downbeat timing feels identical to every other beat.
	const downbeatBeep = (t) =>
		tone(t, {
			freq: 2400,
			type: "sine",
			dur: 0.04,
			gain: 0.05,
			attack: 0.001,
		});

	// grid marker — the distant closed hat
	const subTick = (t) => hiHat808(t);

	// left = kick, right = snare. Downbeat gets a subtle sine beep on top.
	const playHit = (t, isL, isR, isDownbeat = false) => {
		if (isL) kick808(t);
		if (isR) snare808(t);
		if (isDownbeat) downbeatBeep(t);
	};

	/* ---------------- scheduling ---------------- */

	const resetPosition = useCallback(() => {
		const ctx = ctxRef.current;
		if (!ctx) return;
		colRef.current = 0;
		queueRef.current = [];
		nextTimeRef.current = ctx.currentTime + 0.06;
		cycleStartRef.current = nextTimeRef.current;
	}, []);

	const schedule = useCallback(() => {
		const ctx = ctxRef.current;
		if (!ctx) return;
		const p = paramsRef.current;
		const total = p.left * p.right;
		// bpm = left-hand strike rate; each cell is 1/right of a left beat.
		const colDur = 60 / (p.bpm * p.right);
		while (nextTimeRef.current < ctx.currentTime + 0.12) {
			const c = colRef.current % total;
			const isL = c % p.right === 0;
			const isR = c % p.left === 0;
			const isDownbeat = c === 0;
			const t = nextTimeRef.current;
			if (p.subdiv) subTick(t);
			if (isL || isR) playHit(t, isL, isR, isDownbeat);
			queueRef.current.push({ col: c, time: t });
			nextTimeRef.current = t + colDur;
			colRef.current = (c + 1) % total;
		}
	}, []);

	const frame = useCallback(() => {
		const ctx = ctxRef.current;
		if (ctx) {
			const now = ctx.currentTime;
			const q = queueRef.current;
			while (q.length && q[0].time <= now) {
				const e = q.shift();
				if (e.col === 0) cycleStartRef.current = e.time;
				setCol(e.col);
			}
			const p = paramsRef.current;
			// one cycle spans `left` left-hand beats
			const cycleDur = (60 * p.left) / p.bpm;
			let ph = (now - cycleStartRef.current) / cycleDur;
			if (!isFinite(ph) || ph < 0) ph = 0;
			if (ph > 1) ph = 1;
			if (headRef.current) headRef.current.style.left = ph * 100 + "%";
		}
		rafRef.current = requestAnimationFrame(frame);
	}, []);

	const start = () => {
		const ctx = getCtx();
		primeSilentAudio();
		// silent HTMLAudio keeps iOS in "Playback" session (ignores mute switch)
		silentAudioRef.current.play().catch(() => {});
		if (ctx.state === "suspended") ctx.resume().catch(() => {});
		resetPosition();
		setPlaying(true);
		timerRef.current = setInterval(schedule, 25);
		schedule();
		rafRef.current = requestAnimationFrame(frame);
	};

	const stop = () => {
		setPlaying(false);
		clearInterval(timerRef.current);
		cancelAnimationFrame(rafRef.current);
		timerRef.current = null;
		rafRef.current = null;
		queueRef.current = [];
		if (silentAudioRef.current) {
			silentAudioRef.current.pause();
			try {
				silentAudioRef.current.currentTime = 0;
			} catch {
				/* ignore — iOS sometimes throws before metadata loads */
			}
		}
		setCol(-1);
		if (headRef.current) headRef.current.style.left = "0%";
	};

	const toggle = () => (playing ? stop() : start());

	// changing a hand's count changes the grid, so restart the cycle cleanly
	useEffect(() => {
		if (playing) resetPosition();
	}, [left, right, playing, resetPosition]);

	useEffect(() => {
		const onKey = (e) => {
			if (
				e.code === "Space" &&
				e.target.tagName !== "INPUT" &&
				e.target.tagName !== "BUTTON"
			) {
				e.preventDefault();
				toggle();
			}
		};
		// iOS may suspend or close the AudioContext when Safari is backgrounded,
		// which can leave the scheduler wedged (timers still armed, but audio
		// dead). Stop cleanly on hide so the Start button always recovers.
		const onVisibility = () => {
			if (document.hidden && playing) stop();
		};
		window.addEventListener("keydown", onKey);
		document.addEventListener("visibilitychange", onVisibility);
		return () => {
			window.removeEventListener("keydown", onKey);
			document.removeEventListener("visibilitychange", onVisibility);
		};
	});

	useEffect(
		() => () => {
			clearInterval(timerRef.current);
			cancelAnimationFrame(rafRef.current);
			if (silentAudioRef.current) {
				silentAudioRef.current.pause();
				silentAudioRef.current.src = "";
				silentAudioRef.current = null;
			}
			if (ctxRef.current) ctxRef.current.close();
		},
		[],
	);

	/* ---------------- view ---------------- */

	// cycle spans `left` left-hand beats
	const cycleSec = ((60 * left) / bpm).toFixed(2);

	const rows = [
		{ key: "b", label: "left", hit: (c) => c % right === 0 },
		{ key: "c", label: "right", hit: (c) => c % left === 0 },
	];

	const cellStyle = { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` };

	return (
		<div className="pr">
			<style>{CSS}</style>
			<div className="pr-wrap">
				<div className="pr-head">
					<div>
						<div className="pr-ratio">
							<span className="l">{left}</span>
							<span className="c">:</span>
							<span className="r">{right}</span>
						</div>
						<div className="pr-sub">
							{left} in the left hand against {right} in the right
						</div>
					</div>
					<button
						className={"pr-btn" + (playing ? " on" : "")}
						onClick={toggle}
					>
						{playing ? "Stop" : "Start"}
					</button>
				</div>

				<div className="pr-panel">
					<div className="pr-grid">
						{rows.map((r) => (
							<div className={"pr-row " + r.key} key={r.key}>
								<span className="pr-label">{r.label}</span>
								<div className="pr-cells" style={cellStyle}>
									{Array.from({ length: cols }, (_, c) => {
										const on = r.hit(c);
										return (
											<span className="pr-cell" key={c}>
												<span
													className={
														"pr-dot" +
														(on ? " hit" : subdiv ? " rest" : "") +
														(c === col && (on || subdiv) ? " now" : "")
													}
												/>
											</span>
										);
									})}
								</div>
							</div>
						))}
						<div className="pr-overlay">
							<div className="pr-lines" style={cellStyle}>
								{Array.from({ length: cols }, (_, c) => (
									<i className={c % right === 0 ? "beat" : ""} key={c} />
								))}
							</div>
							{playing && <div className="pr-head-line" ref={headRef} />}
						</div>
					</div>
				</div>

				<div className="pr-controls">
					<div>
						<div className="pr-ctl-label">
							<span>Tempo · left hand</span>
							<b>
								{bpm} bpm &nbsp;·&nbsp; cycle {cycleSec}s
							</b>
						</div>
						<input
							type="range"
							min="20"
							max="220"
							value={bpm}
							onChange={(e) => setBpm(+e.target.value)}
						/>
					</div>

					<div className="pr-hands">
						<div className="lh">
							<div className="pr-ctl-label">
								<span>Left</span>
							</div>
							<div className="pr-nums">
								{CHOICES.map((v) => (
									<button
										key={v}
										className={"pr-num" + (v === left ? " sel" : "")}
										onClick={() => setLeft(v)}
									>
										{v}
									</button>
								))}
							</div>
						</div>
						<div className="rh">
							<div className="pr-ctl-label">
								<span>Right</span>
							</div>
							<div className="pr-nums">
								{CHOICES.map((v) => (
									<button
										key={v}
										className={"pr-num" + (v === right ? " sel" : "")}
										onClick={() => setRight(v)}
									>
										{v}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="pr-switch">
						<span className="pr-switch-text">
							Background beat
							<em>A hi-hat on every grid cell — {cols} per cycle</em>
						</span>
						<button
							className={"pr-toggle" + (subdiv ? " on" : "")}
							role="switch"
							aria-checked={subdiv}
							aria-label="Background beat"
							onClick={() => setSubdiv((s) => !s)}
						>
							<span />
						</button>
					</div>

					<div>
						<div className="pr-ctl-label">
							<span>Volume</span>
							<b>{Math.round(volume * 100)}%</b>
						</div>
						<input
							type="range"
							min="0"
							max="1"
							step="0.01"
							value={volume}
							onChange={(e) => setVolume(+e.target.value)}
						/>
					</div>
				</div>

				<div className="pr-foot">Space bar starts and stops.</div>
			</div>
		</div>
	);
}
