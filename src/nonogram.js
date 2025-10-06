import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle
} from 'https://esm.sh/react@18.2.0';
import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client';
import { createPortal } from 'https://esm.sh/react-dom@18.2.0';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  PLAYER_KEY,
  NONOGRAM_PUZZLES,
  NONOGRAM_PUZZLE_LABELS,
  NONOGRAM_BEST_KEY_BASE
} from './constants.js';
import {
  addHS,
  renderHS,
  formatNonogramTime,
  getBestTime
} from './nonogramHighscores.js';
import {
  getNonogramPuzzle,
  computeLineClues,
  createEmptyBoard,
  countFilledCells,
  normalizePuzzleId
} from './nonogramData.js';

const html = htm.bind(React.createElement);
const LONG_PRESS_MS = 420;
const DEFAULT_PUZZLE = NONOGRAM_PUZZLES[0] || 'classic';

function bestKey(puzzleId){
  return `${NONOGRAM_BEST_KEY_BASE}_${puzzleId}`;
}

function readPersonalBest(puzzleId){
  const value = Number(localStorage.getItem(bestKey(puzzleId)) || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function useHiddenSelect(puzzleId, onSelect){
  const selectRef = useRef(null);

  useEffect(() => {
    const select = document.getElementById('nonogramPuzzleSelect');
    if(!select){
      return;
    }
    selectRef.current = select;
    select.setAttribute('aria-hidden', 'true');
    select.classList.add('hidden');
    select.innerHTML = '';
    NONOGRAM_PUZZLES.forEach(id => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = NONOGRAM_PUZZLE_LABELS[id] || id;
      select.appendChild(option);
    });
    select.value = puzzleId;
    const handleChange = event => {
      const next = normalizePuzzleId(event.target.value, DEFAULT_PUZZLE);
      if(onSelect){
        onSelect(next);
      }
    };
    select.addEventListener('change', handleChange);
    return () => {
      select.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const select = selectRef.current;
    if(select){
      select.value = puzzleId;
    }
  }, [puzzleId]);
}

function CompletionOverlay({ visible, info, onRestart, onClose }){
  if(!visible || !info){
    return null;
  }
  const { time, personalBest, leaderboardBest, gaveUp } = info;
  return createPortal(html`
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 text-2xl">
            ${gaveUp ? '🧩' : '🎉'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              ${gaveUp ? 'Rätsel angezeigt' : 'Nonogramm gelöst!'}
            </h2>
            <p className="text-sm text-slate-600">
              ${gaveUp ? 'Du kannst jederzeit ein neues Rätsel starten.' : 'Starke Leistung – weiter so!'}
            </p>
          </div>
        </div>
        <dl className="mt-6 space-y-3">
          ${gaveUp ? null : html`
            <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3">
              <dt className="text-sm font-medium text-slate-600">Deine Zeit</dt>
              <dd className="text-lg font-semibold text-slate-900">${formatNonogramTime(time)}</dd>
            </div>
          `}
          ${personalBest ? html`
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-sm font-medium text-slate-600">Persönliche Bestzeit</dt>
              <dd className="text-lg font-semibold text-slate-900">${formatNonogramTime(personalBest)}</dd>
            </div>
          ` : null}
          ${leaderboardBest ? html`
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
              <dt className="text-sm font-medium text-slate-600">Top-Zeit (Leaderboard)</dt>
              <dd className="text-lg font-semibold text-slate-900">${formatNonogramTime(leaderboardBest)}</dd>
            </div>
          ` : null}
        </dl>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            onClick=${onRestart}
          >
            ${gaveUp ? 'Neues Rätsel' : 'Noch einmal'}
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick=${onClose}
          >
            Weiter spielen
          </button>
        </div>
      </div>
    </div>
  `, document.body);
}

function NonogramControls({
  puzzleId,
  onPuzzleChange,
  onRandomPuzzle,
  onReset,
  onGiveUp,
  onPauseToggle,
  paused,
  timerLabel,
  personalBest,
  leaderboardBest,
  progress,
  activeTool,
  onToolChange
}){
  return html`
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Rätsel
            <select
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
              value=${puzzleId}
              onChange=${event => onPuzzleChange(event.target.value)}
            >
              ${NONOGRAM_PUZZLES.map(id => html`<option key=${id} value=${id}>${NONOGRAM_PUZZLE_LABELS[id] || id}</option>`) }
            </select>
          </label>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            onClick=${onRandomPuzzle}
          >
            <span aria-hidden="true">🔀</span>
            Zufall
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
            onClick=${onReset}
          >
            <span aria-hidden="true">↻</span>
            Zurücksetzen
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-transparent bg-rose-500/90 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            onClick=${onGiveUp}
          >
            <span aria-hidden="true">⚑</span>
            Aufgeben
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            onClick=${onPauseToggle}
          >
            <span aria-hidden="true">${paused ? '▶' : '⏸'}</span>
            ${paused ? 'Fortsetzen' : 'Pause'}
          </button>
          <div className="flex flex-col text-right">
            <span className="text-xs uppercase tracking-wide text-slate-500">Zeit</span>
            <span className="text-lg font-semibold text-slate-900">${timerLabel}</span>
          </div>
          <div className="hidden flex-col text-right sm:flex">
            <span className="text-xs uppercase tracking-wide text-slate-500">Best</span>
            <span className="text-sm font-semibold text-slate-900">
              ${personalBest ? formatNonogramTime(personalBest) : '--'}
            </span>
          </div>
          <div className="hidden flex-col text-right md:flex">
            <span className="text-xs uppercase tracking-wide text-slate-500">Top</span>
            <span className="text-sm font-semibold text-slate-900">
              ${leaderboardBest ? formatNonogramTime(leaderboardBest) : '--'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="grid grid-cols-3 gap-2 sm:w-auto sm:grid-cols-3">
          ${[
            { id: 'fill', label: 'Füllen', icon: '⬛' },
            { id: 'mark', label: 'Markieren', icon: '✕' },
            { id: 'clear', label: 'Leeren', icon: '⌫' }
          ].map(tool => html`
            <button
              key=${tool.id}
              type="button"
              className=${`flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${activeTool === tool.id ? 'bg-sky-600 text-white shadow-sm' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50'}`}
              onClick=${() => onToolChange(tool.id)}
            >
              <span aria-hidden="true">${tool.icon}</span>
              ${tool.label}
            </button>
          `)}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-slate-500">
            <span>Fortschritt</span>
            <span>${Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 transition-all duration-300"
              style=${{ width: `${Math.round(progress * 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
      <p className="rounded-2xl bg-slate-900/5 px-4 py-3 text-sm text-slate-600">
        Tipp: Linksklick oder kurzes Tippen füllt eine Zelle. Rechtsklick oder langes Drücken setzt ein ✕. Über die Tool-Leiste kannst du auf Touch-Geräten bequem zwischen den Modi wechseln.
      </p>
    </div>
  `;
}

function GridHints({ orientation, clues }){
  const style = orientation === 'cols'
    ? {
        gridTemplateColumns: `repeat(${clues.length}, var(--cell-size))`,
        fontSize: 'var(--clue-font)',
        gap: 'var(--clue-gap)'
      }
    : {
        gridTemplateRows: `repeat(${clues.length}, var(--cell-size))`,
        fontSize: 'var(--clue-font)',
        gap: 'var(--clue-gap)'
      };
  return html`
    <div
      className=${`grid ${orientation === 'cols' ? 'items-end justify-items-center px-1 pb-1' : 'items-center justify-items-end pr-1'}`}
      style=${style}
    >
      ${clues.map((line, index) => html`
        <div key=${index} className="flex flex-wrap items-center justify-center gap-1 text-sm font-semibold text-slate-600">
          ${line.map((value, idx) => html`
            <span key=${idx} className="inline-flex min-w-[1.5ch] items-center justify-center">
              ${value === 0 ? '•' : value}
            </span>
          `)}
        </div>
      `)}
    </div>
  `;
}

function NonogramCell({
  row,
  col,
  state,
  touchTool,
  disabled,
  onAction,
  error,
  maxRows,
  maxCols
}){
  const pointerRef = useRef({ timeout: null, longPressFired: false });

  const clearTimer = () => {
    const { timeout } = pointerRef.current;
    if(timeout){
      clearTimeout(timeout);
      pointerRef.current.timeout = null;
    }
  };

  const handlePointerDown = useCallback(event => {
    if(disabled) return;
    if(event.pointerType === 'mouse') return;
    pointerRef.current.longPressFired = false;
    clearTimer();
    pointerRef.current.timeout = setTimeout(() => {
      pointerRef.current.longPressFired = true;
      onAction(row, col, 'mark');
    }, LONG_PRESS_MS);
  }, [disabled, row, col, onAction]);

  const handlePointerUp = useCallback(event => {
    if(disabled) return;
    if(event.pointerType === 'mouse') return;
    const fired = pointerRef.current.longPressFired;
    clearTimer();
    if(!fired){
      onAction(row, col, touchTool);
    }
    pointerRef.current.longPressFired = false;
  }, [disabled, row, col, onAction, touchTool]);

  const handlePointerLeave = useCallback(() => {
    clearTimer();
    pointerRef.current.longPressFired = false;
  }, []);

  const handleClick = useCallback(event => {
    if(disabled) return;
    if(pointerRef.current.longPressFired){
      pointerRef.current.longPressFired = false;
      event.preventDefault();
      return;
    }
    onAction(row, col, 'fill');
  }, [disabled, row, col, onAction]);

  const handleContextMenu = useCallback(event => {
    event.preventDefault();
    if(disabled) return;
    onAction(row, col, 'mark');
  }, [disabled, row, col, onAction]);

  const handleAuxClick = useCallback(event => {
    if(event.button !== 1) return;
    event.preventDefault();
    if(disabled) return;
    onAction(row, col, 'clear');
  }, [disabled, row, col, onAction]);

  useEffect(() => () => clearTimer(), []);

  const stateClasses = state === 'filled'
    ? 'bg-slate-900 text-white shadow-inner shadow-slate-900/30'
    : state === 'marked'
      ? 'bg-white text-slate-500'
      : 'bg-white text-transparent';

  const majorCol = (col + 1) % 5 === 0 && col + 1 !== maxCols;
  const majorRow = (row + 1) % 5 === 0 && row + 1 !== maxRows;
  const borderClasses = `border border-slate-200 ${majorCol ? 'border-r-2 border-r-slate-400' : ''} ${majorRow ? 'border-b-2 border-b-slate-400' : ''}`;

  return html`
    <button
      type="button"
      className=${`relative flex select-none items-center justify-center rounded-lg ${stateClasses} ${borderClasses} transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${error ? 'ring-2 ring-rose-400' : ''}`}
      data-state=${state}
      aria-label=${`Feld ${row + 1},${col + 1} – ${state === 'filled' ? 'gefüllt' : state === 'marked' ? 'markiert' : 'leer'}`}
      disabled=${disabled}
      onClick=${handleClick}
      onContextMenu=${handleContextMenu}
      onAuxClick=${handleAuxClick}
      onPointerDown=${handlePointerDown}
      onPointerUp=${handlePointerUp}
      onPointerLeave=${handlePointerLeave}
      onPointerCancel=${handlePointerLeave}
      style=${{
        width: 'var(--cell-size)',
        height: 'var(--cell-size)'
      }}
    >
      ${state === 'marked' ? html`<span className="text-xl font-semibold text-slate-400">✕</span>` : null}
    </button>
  `;
}

const NonogramApp = React.forwardRef(function NonogramApp({ initialPuzzleId }, ref){
  const [puzzleId, setPuzzleId] = useState(() => normalizePuzzleId(initialPuzzleId, DEFAULT_PUZZLE));
  const puzzle = useMemo(() => getNonogramPuzzle(puzzleId), [puzzleId]);
  const rows = puzzle.grid.length;
  const cols = puzzle.grid[0].length;
  const [resetKey, setResetKey] = useState(0);
  const [board, setBoard] = useState(() => createEmptyBoard(rows, cols));
  const [activeTool, setActiveTool] = useState('fill');
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [gaveUp, setGaveUp] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayInfo, setOverlayInfo] = useState(null);
  const [status, setStatus] = useState('');
  const [statusTone, setStatusTone] = useState('neutral');
  const timerRef = useRef(null);
  const startedAtRef = useRef(Date.now());

  const [personalBest, setPersonalBest] = useState(() => readPersonalBest(puzzleId));
  const [leaderboardBest, setLeaderboardBest] = useState(() => getBestTime(puzzleId));

  useHiddenSelect(puzzleId, next => {
    setPuzzleId(next);
    setResetKey(key => key + 1);
  });

  const rowClues = useMemo(() => puzzle.grid.map(computeLineClues), [puzzle]);
  const colClues = useMemo(() => {
    const list = [];
    for(let c = 0; c < cols; c++){
      const column = puzzle.grid.map(row => row[c]);
      list.push(computeLineClues(column));
    }
    return list;
  }, [puzzle, cols]);

  const requiredCells = useMemo(() => countFilledCells(puzzle.grid), [puzzle]);

  useEffect(() => {
    setBoard(createEmptyBoard(rows, cols));
    setRunning(true);
    setPaused(false);
    setCompleted(false);
    setGaveUp(false);
    setElapsed(0);
    setOverlayVisible(false);
    setOverlayInfo(null);
    startedAtRef.current = Date.now();
    setStatus('Viel Erfolg!');
    setStatusTone('neutral');
  }, [puzzleId, rows, cols, resetKey]);

  useEffect(() => {
    setPersonalBest(readPersonalBest(puzzleId));
    setLeaderboardBest(getBestTime(puzzleId));
    renderHS(puzzleId, { tableSelector: '#nonogramScoreTable' });
  }, [puzzleId]);

  useEffect(() => {
    if(timerRef.current){
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if(!running || paused || completed){
      return undefined;
    }
    startedAtRef.current = Date.now() - elapsed;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 200);
    return () => {
      if(timerRef.current){
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running, paused, completed]);

  useEffect(() => () => {
    if(timerRef.current){
      clearInterval(timerRef.current);
    }
  }, []);

  const derived = useMemo(() => {
    let correct = 0;
    let hasMissing = false;
    const errorSet = new Set();
    for(let r = 0; r < rows; r++){
      for(let c = 0; c < cols; c++){
        const shouldFill = puzzle.grid[r][c] === 1;
        const current = board[r]?.[c];
        const key = `${r}-${c}`;
        if(shouldFill){
          if(current === 'filled'){
            correct++;
          }else{
            hasMissing = true;
            if(current === 'marked'){
              errorSet.add(key);
            }
          }
        }else if(current === 'filled'){
          errorSet.add(key);
        }
      }
    }
    const solved = !hasMissing && errorSet.size === 0 && requiredCells > 0;
    return {
      progress: requiredCells ? correct / requiredCells : 1,
      solved,
      errors: errorSet,
      hasMissing
    };
  }, [board, puzzle, rows, cols, requiredCells]);

  useEffect(() => {
    if(!running || paused || completed || gaveUp){
      return;
    }
    if(derived.solved){
      const seconds = Math.max(1, Math.round(elapsed / 1000));
      setRunning(false);
      setCompleted(true);
      setStatus('Perfekt gelöst! 🎯');
      setStatusTone('success');
      const playerName = localStorage.getItem(PLAYER_KEY) || 'Player';
      const payload = {
        name: playerName,
        time: seconds,
        date: new Date().toLocaleDateString()
      };
      const finalize = () => {
        const leaderboardTime = getBestTime(puzzleId);
        setLeaderboardBest(leaderboardTime);
        renderHS(puzzleId, { tableSelector: '#nonogramScoreTable' });
        const stored = readPersonalBest(puzzleId);
        setOverlayInfo({
          time: seconds,
          personalBest: stored,
          leaderboardBest: leaderboardTime,
          gaveUp: false
        });
        setOverlayVisible(true);
      };
      void addHS(payload, puzzleId).then(finalize).catch(finalize);
      const previousBest = readPersonalBest(puzzleId);
      if(!previousBest || seconds < previousBest){
        localStorage.setItem(bestKey(puzzleId), String(seconds));
        setPersonalBest(seconds);
      }else{
        setPersonalBest(previousBest);
      }
    }else if(derived.errors.size > 0){
      setStatus('Es gibt markierte Fehler – prüfe rot hervorgehobene Felder.');
      setStatusTone('warning');
    }else if(!derived.hasMissing && derived.progress > 0){
      setStatus('Alle bisherigen Züge stimmen ✔️');
      setStatusTone('success');
    }else if(derived.progress > 0){
      setStatus('Weiter so – die Hinweise helfen dir Schritt für Schritt.');
      setStatusTone('neutral');
    }
  }, [derived, elapsed, running, paused, completed, gaveUp, puzzleId]);

  const handleAction = useCallback((row, col, action) => {
    if(!running || paused || completed){
      return;
    }
    setBoard(prev => {
      const current = prev[row]?.[col];
      let next = current;
      if(action === 'fill'){
        next = current === 'filled' ? 'empty' : 'filled';
      }else if(action === 'mark'){
        next = current === 'marked' ? 'empty' : 'marked';
      }else if(action === 'clear'){
        next = 'empty';
      }
      if(next === current){
        return prev;
      }
      const clone = prev.map(line => line.slice());
      clone[row][col] = next;
      return clone;
    });
  }, [running, paused, completed]);

  const startPuzzle = useCallback((id, { reset = false } = {}) => {
    const normalized = normalizePuzzleId(id, DEFAULT_PUZZLE);
    if(normalized === puzzleId && !reset){
      setResetKey(key => key + 1);
    }else{
      setPuzzleId(normalized);
      if(reset){
        setResetKey(key => key + 1);
      }
    }
  }, [puzzleId]);

  const handleRandomPuzzle = useCallback(() => {
    const pool = NONOGRAM_PUZZLES.filter(Boolean);
    if(pool.length <= 1){
      setResetKey(key => key + 1);
      return;
    }
    const filtered = pool.filter(id => id !== puzzleId);
    const next = filtered[Math.floor(Math.random() * filtered.length)] || pool[0];
    startPuzzle(next, { reset: true });
  }, [puzzleId, startPuzzle]);

  const handleGiveUp = useCallback(() => {
    setBoard(puzzle.grid.map(row => row.map(cell => (cell ? 'filled' : 'empty'))));
    setRunning(false);
    setPaused(false);
    setCompleted(true);
    setGaveUp(true);
    setStatus('Lösung eingeblendet – probiere gleich das nächste Rätsel.');
    setStatusTone('warning');
    setOverlayInfo({
      time: Math.max(1, Math.round(elapsed / 1000)),
      personalBest,
      leaderboardBest,
      gaveUp: true
    });
    setOverlayVisible(true);
  }, [puzzle, elapsed, personalBest, leaderboardBest]);

  const togglePause = useCallback(() => {
    if(!running){
      setRunning(true);
      setPaused(false);
      startedAtRef.current = Date.now() - elapsed;
      return;
    }
    setPaused(prev => !prev);
  }, [running, elapsed]);

  const stopGame = useCallback(() => {
    setRunning(false);
    setPaused(false);
  }, []);

  useImperativeHandle(ref, () => ({
    start: () => startPuzzle(puzzleId, { reset: true }),
    pause: () => setPaused(true),
    resume: () => {
      if(!completed && running){
        setPaused(false);
        startedAtRef.current = Date.now() - elapsed;
      }else if(!completed){
        setRunning(true);
        setPaused(false);
        startedAtRef.current = Date.now() - elapsed;
      }
    },
    stop: stopGame,
    hideOverlay: () => setOverlayVisible(false),
    showOverlay: () => {
      if(overlayInfo){
        setOverlayVisible(true);
      }
    },
    syncScores: () => {
      setPersonalBest(readPersonalBest(puzzleId));
      setLeaderboardBest(getBestTime(puzzleId));
    }
  }), [startPuzzle, puzzleId, stopGame, overlayInfo, completed, running, elapsed]);

  const cellSize = useMemo(() => `clamp(22px, calc(70vw / ${Math.max(rows, cols) + 6}), 52px)`, [rows, cols]);

  const boardStyle = useMemo(() => ({
    '--cell-size': cellSize,
    '--cell-gap': '4px',
    '--clue-font': 'clamp(0.7rem, 1.4vw, 0.95rem)',
    '--clue-gap': '4px'
  }), [cellSize]);

  return html`
    <div className="flex flex-col gap-6">
      <NonogramControls
        puzzleId=${puzzleId}
        onPuzzleChange=${id => startPuzzle(id, { reset: true })}
        onRandomPuzzle=${handleRandomPuzzle}
        onReset=${() => startPuzzle(puzzleId, { reset: true })}
        onGiveUp=${handleGiveUp}
        onPauseToggle=${togglePause}
        paused=${paused}
        timerLabel=${formatNonogramTime(Math.floor(elapsed / 1000))}
        personalBest=${personalBest}
        leaderboardBest=${leaderboardBest}
        progress=${derived.progress}
        activeTool=${activeTool}
        onToolChange=${setActiveTool}
      />
      <div className="flex flex-col gap-6 xl:flex-row">
        <div className="flex flex-col items-center gap-4">
          <div className="relative inline-grid gap-2" style=${boardStyle}>
            <div
              className="rounded-lg bg-slate-100"
              style=${{
                width: 'var(--cell-size)',
                height: 'var(--cell-size)'
              }}
            ></div>
            <GridHints orientation="cols" clues=${colClues} />
            <GridHints orientation="rows" clues=${rowClues} />
            <div
              className="grid rounded-3xl border border-slate-200 bg-slate-300/60 shadow-inner"
              style=${{
                gridTemplateColumns: `repeat(${cols}, var(--cell-size))`,
                gap: 'var(--cell-gap)',
                padding: 'var(--cell-gap)'
              }}
            >
              ${board.map((rowCells, rowIndex) => rowCells.map((cell, colIndex) => html`
                <NonogramCell
                  key=${`${rowIndex}-${colIndex}`}
                  row=${rowIndex}
                  col=${colIndex}
                  state=${cell}
                  touchTool=${activeTool}
                  disabled=${!running || paused || completed}
                  onAction=${handleAction}
                  error=${derived.errors.has(`${rowIndex}-${colIndex}`)}
                  maxRows=${rows}
                  maxCols=${cols}
                />
              `))}
            </div>
          </div>
          <div className=${`w-full max-w-lg rounded-3xl px-5 py-4 text-center text-sm font-medium ${statusTone === 'warning' ? 'bg-amber-100 text-amber-800' : statusTone === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
            ${status}
          </div>
        </div>
        <aside className="flex-1 space-y-4 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Wie du spielst</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Die Zahlen am Rand verraten, wie viele zusammenhängende Felder pro Zeile oder Spalte gefüllt werden müssen. Mehrere Zahlen bedeuten, dass dazwischen mindestens ein Feld frei bleibt.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Nutze Markierungen für sichere Leerfelder und arbeite systematisch Zeile für Zeile. Der Fortschrittsbalken zeigt dir, wie nah du der Lösung bist.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Aktuelles Rätsel</h4>
            <p className="mt-1 text-lg font-semibold text-slate-900">${puzzle.title}</p>
            <p className="text-sm text-slate-600">${rows} × ${cols} Zellen • ${requiredCells} Felder ausfüllen</p>
          </div>
          <div className="rounded-2xl bg-slate-900/90 p-4 text-white">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-white/70">Leaderboard</h4>
            <p className="mt-2 text-sm text-white/80">Die schnellsten Zeiten findest du im globalen Scoreboard-Menü.</p>
            <p className="mt-1 text-sm text-white/80">Aktuelle Top-Zeit: <span className="font-semibold">${leaderboardBest ? formatNonogramTime(leaderboardBest) : '--'}</span></p>
          </div>
        </aside>
      </div>
      <CompletionOverlay
        visible=${overlayVisible}
        info=${overlayInfo}
        onRestart=${() => {
          setOverlayVisible(false);
          setOverlayInfo(null);
          startPuzzle(puzzleId, { reset: true });
        }}
        onClose=${() => setOverlayVisible(false)}
      />
    </div>
  `;
});

export function initNonogram(){
  const container = document.getElementById('nonogramRoot');
  if(!container){
    return {
      start: () => {},
      pause: () => {},
      resume: () => {},
      stop: () => {},
      hideOverlay: () => {},
      showOverlay: () => {}
    };
  }
  const initialSelect = document.getElementById('nonogramPuzzleSelect');
  const initialPuzzle = initialSelect ? normalizePuzzleId(initialSelect.value, DEFAULT_PUZZLE) : DEFAULT_PUZZLE;
  const root = createRoot(container);
  const controllerRef = React.createRef();
  root.render(html`<${NonogramApp} initialPuzzleId=${initialPuzzle} ref=${controllerRef} />`);

  const controller = {
    start: () => controllerRef.current?.start?.(),
    pause: () => controllerRef.current?.pause?.(),
    resume: () => controllerRef.current?.resume?.(),
    stop: () => controllerRef.current?.stop?.(),
    hideOverlay: () => controllerRef.current?.hideOverlay?.(),
    showOverlay: () => controllerRef.current?.showOverlay?.()
  };

  document.addEventListener('nonogramHsCleared', () => {
    controllerRef.current?.syncScores?.();
  });

  document.addEventListener('menuToggle', event => {
    if(event.detail && event.detail.show){
      controller.pause();
    }else{
      controller.resume();
    }
  });

  return controller;
}
