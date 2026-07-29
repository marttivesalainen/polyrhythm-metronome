import { useState, useEffect, useRef, useCallback } from "react";

/* ------------------------------------------------------------------ *
 * Polyrhythm trainer
 * left hand plays `left` strikes per cycle, right hand plays `right`.
 * Grid is left*right columns, so a left strike lands every `right`
 * columns and a right strike every `left` columns. They meet at 0.
 * Tempo is the left hand's pulse (60/bpm between left strikes).
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

export default function PolyrhythmTrainer() {
	const [left, setLeft] = useState(5);
	const [right, setRight] = useState(3);
	const [bpm, setBpm] = useState(80);
	const [volume, setVolume] = useState(0.8);
	const [subdiv, setSubdiv] = useState(true);
	const [playing, setPlaying] = useState(false);
	const [col, setCol] = useState(-1);

	const ctxRef = useRef(null);
	const masterRef = useRef(null);
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

	const cols = left * right;

	/* ---------------- audio ---------------- */

	const getCtx = () => {
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

	useEffect(() => {
		if (masterRef.current) masterRef.current.gain.value = volume;
	}, [volume]);

	const tone = (t, { freq, type, dur, gain, drop }) => {
		const ctx = ctxRef.current;
		const o = ctx.createOscillator();
		const g = ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t);
		if (drop) o.frequency.exponentialRampToValueAtTime(freq * drop, t + dur);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.linearRampToValueAtTime(gain, t + 0.003);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(masterRef.current);
		o.start(t);
		o.stop(t + dur + 0.03);
	};

	// thin tick under everything, one per grid cell
	const subTick = (t) =>
		tone(t, { freq: 1650, type: "square", dur: 0.022, gain: 0.07 });

	// left hand: low woody knock. right hand: high glassy ping.
	const playHit = (t, isL, isR) => {
		if (isL)
			tone(t, {
				freq: 300,
				type: "triangle",
				dur: 0.11,
				gain: 0.75,
				drop: 0.55,
			});
		if (isR) tone(t, { freq: 900, type: "sine", dur: 0.07, gain: 0.4 });
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
		const colDur = 60 / (p.bpm * p.right);
		while (nextTimeRef.current < ctx.currentTime + 0.12) {
			const c = colRef.current % total;
			const isL = c % p.right === 0;
			const isR = c % p.left === 0;
			const t = nextTimeRef.current;
			if (p.subdiv) subTick(t);
			if (isL || isR) playHit(t, isL, isR);
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
		if (ctx.state === "suspended") ctx.resume();
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
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	});

	useEffect(
		() => () => {
			clearInterval(timerRef.current);
			cancelAnimationFrame(rafRef.current);
			if (ctxRef.current) ctxRef.current.close();
		},
		[],
	);

	/* ---------------- view ---------------- */

	const rightBpm = Math.round((bpm * right) / left);
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
								{bpm} bpm &nbsp;·&nbsp; right hand {rightBpm} &nbsp;·&nbsp;
								cycle {cycleSec}s
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
							<em>A tick on every cell of the grid — {cols} per cycle</em>
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

				<div className="pr-foot">
					Low knock = left hand, high ping = right hand. The background beat is
					a thin tick marking the underlying grid. Space bar starts and stops.
				</div>
			</div>
		</div>
	);
}
