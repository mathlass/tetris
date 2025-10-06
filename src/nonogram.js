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
  NONOGRAM_DIFFICULTIES,
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
  normalizeDifficulty
} from './nonogramData.js';

const html = htm.bind(React.createElement);
const LONG_PRESS_MS = 420;
const DEFAULT_DIFFICULTY = NONOGRAM_DIFFICULTIES[0] || 'easy';
const MIN_CELL_SIZE = 22;
const MAX_CELL_SIZE = 52;
const BOARD_PADDING_CELLS = 6;
const BOARD_WIDTH_RATIO = 0.7;
const PROGRESS_KEY_PREFIX = 'nonogram_board_v1';
const VALID_CELL_STATES = new Set(['empty', 'filled', 'marked']);

function progressKeyForPuzzle(puzzle){
  if(!puzzle || !puzzle.id){
    return null;
  }
  return `${PROGRESS_KEY_PREFIX}_${puzzle.id}`;
}

function sanitizeStoredBoard(value, rows, cols){
  if(!Array.isArray(value) || value.length !== rows){
    return null;
  }
  const board = [];
  for(let r = 0; r < rows; r++){
    const row = value[r];
    if(!Array.isArray(row) || row.length !== cols){
      return null;
    }
    const sanitizedRow = [];
    for(let c = 0; c < cols; c++){
      const cell = row[c];
      sanitizedRow.push(VALID_CELL_STATES.has(cell) ? cell : 'empty');
    }
    board.push(sanitizedRow);
  }
  return board;
}

function calculateFallbackCellSize(rows, cols){
  if(typeof window === 'undefined'){
    return `${MIN_CELL_SIZE}px`;
  }
  const denominator = Math.max(rows, cols) + BOARD_PADDING_CELLS;
  if(denominator <= 0){
    return `${MIN_CELL_SIZE}px`;
  }
  const viewportWidth = Math.max(
    window.innerWidth || 0,
    (window.document && window.document.documentElement && window.document.documentElement.clientWidth) || 0,
    (window.screen && window.screen.width) || 0
  );
  if(viewportWidth <= 0){
    return `${MIN_CELL_SIZE}px`;
  }
  const raw = (viewportWidth * BOARD_WIDTH_RATIO) / denominator;
  const clamped = Math.min(MAX_CELL_SIZE, Math.max(MIN_CELL_SIZE, raw));
  const rounded = Math.round(clamped * 100) / 100;
  return `${rounded}px`;
}

function bestKey(puzzleId){
  return `${NONOGRAM_BEST_KEY_BASE}_${puzzleId}`;
}

function readPersonalBest(puzzleId){
  const value = Number(localStorage.getItem(bestKey(puzzleId)) || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
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

function GridHints({ orientation, clues, completed = [] }){
  const isCols = orientation === 'cols';
  return html`
    <div className=${`nonogram-clues ${isCols ? 'nonogram-clues--cols' : 'nonogram-clues--rows'}`}>
      ${clues.map((line, index) => {
        const values = line.length === 1 && line[0] === 0 ? ['•'] : line;
        const lineClass = `nonogram-clue ${isCols ? 'nonogram-clue--col' : 'nonogram-clue--row'}${completed[index] ? ' nonogram-clue--complete' : ''}`;
        return html`
          <div key=${index} className=${lineClass}>
            ${values.map((value, idx) => html`
              <span key=${idx} className="nonogram-clue__number">${value}</span>
            `)}
          </div>
        `;
      })}
    </div>
  `;
}

function NonogramCell({
  row,
  col,
  state,
  activeTool,
  disabled,
  onAction,
  error,
  maxRows,
  maxCols,
  rowComplete,
  colComplete
}){
  const pointerRef = useRef({ timeout: null, longPressFired: false, ignoreClick: false });

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
      onAction(row, col, activeTool);
    }
    pointerRef.current.longPressFired = false;
    pointerRef.current.ignoreClick = true;
    setTimeout(() => {
      pointerRef.current.ignoreClick = false;
    }, 0);
  }, [disabled, row, col, onAction, activeTool]);

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
    if(pointerRef.current.ignoreClick){
      pointerRef.current.ignoreClick = false;
      event.preventDefault();
      return;
    }
    onAction(row, col, activeTool);
  }, [disabled, row, col, onAction, activeTool]);

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

  const majorCol = (col + 1) % 5 === 0 && col + 1 !== maxCols;
  const majorRow = (row + 1) % 5 === 0 && row + 1 !== maxRows;
  const className = [
    'nonogram-cell',
    state === 'filled' ? 'nonogram-cell--filled' : '',
    state === 'marked' ? 'nonogram-cell--marked' : '',
    error ? 'nonogram-cell--error' : '',
    majorCol ? 'nonogram-cell--major-col' : '',
    majorRow ? 'nonogram-cell--major-row' : '',
    rowComplete ? 'nonogram-cell--row-complete' : '',
    colComplete ? 'nonogram-cell--col-complete' : ''
  ].filter(Boolean).join(' ');

  return html`
    <button
      type="button"
      className=${className}
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
    >
      ${state === 'marked' ? html`<span className="nonogram-cell__mark" aria-hidden="true">✕</span>` : null}
    </button>
  `;
}

const NonogramApp = React.forwardRef(function NonogramApp({ initialDifficulty }, ref){
  const [difficulty, setDifficulty] = useState(() => normalizeDifficulty(initialDifficulty, DEFAULT_DIFFICULTY));
  const [resetKey, setResetKey] = useState(0);
  const [puzzle, setPuzzle] = useState(() => getNonogramPuzzle(difficulty));
  const rows = puzzle.grid.length;
  const cols = puzzle.grid[0].length;
  const [board, setBoard] = useState(() => {
    const key = progressKeyForPuzzle(puzzle);
    if(key && typeof window !== 'undefined'){
      try {
        const raw = localStorage.getItem(key);
        if(raw){
          const parsed = JSON.parse(raw);
          const sanitized = sanitizeStoredBoard(parsed, rows, cols);
          if(sanitized){
            return sanitized.map(line => line.slice());
          }
          localStorage.removeItem(key);
        }
      }catch(error){
        console.warn('Fehler beim Laden des gespeicherten Nonogramms:', error);
        localStorage.removeItem(key);
      }
    }
    return createEmptyBoard(rows, cols);
  });
  const [activeTool, setActiveTool] = useState('fill');
  const [running, setRunning] = useState(true);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [overlayInfo, setOverlayInfo] = useState(null);
  const timerRef = useRef(null);
  const startedAtRef = useRef(Date.now());

  const [personalBest, setPersonalBest] = useState(() => readPersonalBest(difficulty));
  const [leaderboardBest, setLeaderboardBest] = useState(() => getBestTime(difficulty));

  const progressKey = useMemo(() => progressKeyForPuzzle(puzzle), [puzzle]);

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
    let nextBoard = createEmptyBoard(rows, cols);
    if(progressKey && typeof window !== 'undefined'){
      try {
        const raw = localStorage.getItem(progressKey);
        if(raw){
          const parsed = JSON.parse(raw);
          const sanitized = sanitizeStoredBoard(parsed, rows, cols);
          if(sanitized){
            nextBoard = sanitized.map(line => line.slice());
          }else{
            localStorage.removeItem(progressKey);
          }
        }
      }catch(error){
        console.warn('Fehler beim Laden des gespeicherten Nonogramms:', error);
        localStorage.removeItem(progressKey);
      }
    }
    setBoard(nextBoard);
    setRunning(true);
    setPaused(false);
    setCompleted(false);
    setElapsed(0);
    setOverlayVisible(false);
    setOverlayInfo(null);
    setActiveTool('fill');
    startedAtRef.current = Date.now();
  }, [puzzle, rows, cols, progressKey]);

  useEffect(() => {
    setPuzzle(getNonogramPuzzle(difficulty));
  }, [difficulty, resetKey]);

  useEffect(() => {
    setPersonalBest(readPersonalBest(difficulty));
    setLeaderboardBest(getBestTime(difficulty));
    renderHS(difficulty, { tableSelector: '#nonogramScoreTable' });
  }, [difficulty]);

  useEffect(() => {
    if(typeof window === 'undefined' || !progressKey){
      return;
    }
    if(completed){
      localStorage.removeItem(progressKey);
      return;
    }
    try {
      localStorage.setItem(progressKey, JSON.stringify(board));
    }catch(error){
      console.warn('Fehler beim Speichern des Nonogramms:', error);
    }
  }, [board, completed, progressKey]);

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
    const rowComplete = Array(rows).fill(true);
    const colComplete = Array(cols).fill(true);
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
            rowComplete[r] = false;
            colComplete[c] = false;
            if(current === 'marked'){
              errorSet.add(key);
            }
          }
        }else if(current === 'filled'){
          errorSet.add(key);
          rowComplete[r] = false;
          colComplete[c] = false;
        }
      }
    }
    const solved = !hasMissing && errorSet.size === 0 && requiredCells > 0;
    return {
      progress: requiredCells ? correct / requiredCells : 1,
      solved,
      errors: errorSet,
      hasMissing,
      rowComplete,
      colComplete
    };
  }, [board, puzzle, rows, cols, requiredCells]);

  useEffect(() => {
    if(!running || paused || completed){
      return;
    }
    if(derived.solved){
      const seconds = Math.max(1, Math.round(elapsed / 1000));
      setRunning(false);
      setCompleted(true);
      if(progressKey && typeof window !== 'undefined'){
        localStorage.removeItem(progressKey);
      }
      const playerName = localStorage.getItem(PLAYER_KEY) || 'Player';
      const payload = {
        name: playerName,
        time: seconds,
        date: new Date().toLocaleDateString()
      };
      const finalize = () => {
        const leaderboardTime = getBestTime(difficulty);
        setLeaderboardBest(leaderboardTime);
        renderHS(difficulty, { tableSelector: '#nonogramScoreTable' });
        const stored = readPersonalBest(difficulty);
        setOverlayInfo({
          time: seconds,
          personalBest: stored,
          leaderboardBest: leaderboardTime,
          gaveUp: false
        });
        setOverlayVisible(true);
      };
      void addHS(payload, difficulty).then(finalize).catch(finalize);
      const previousBest = readPersonalBest(difficulty);
      if(!previousBest || seconds < previousBest){
        localStorage.setItem(bestKey(difficulty), String(seconds));
        setPersonalBest(seconds);
      }else{
        setPersonalBest(previousBest);
      }
    }
  }, [derived, elapsed, running, paused, completed, difficulty, progressKey]);

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

  const restart = useCallback(() => {
    if(progressKey && typeof window !== 'undefined'){
      localStorage.removeItem(progressKey);
    }
    setResetKey(key => key + 1);
  }, [progressKey]);

  const stopGame = useCallback(() => {
    setRunning(false);
    setPaused(false);
  }, []);

  useImperativeHandle(ref, () => ({
    start: restart,
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
      setPersonalBest(readPersonalBest(difficulty));
      setLeaderboardBest(getBestTime(difficulty));
    }
  }), [restart, stopGame, overlayInfo, completed, running, elapsed, difficulty]);

  useEffect(() => {
    const select = document.getElementById('nonogramDifficulty');
    if(!select){
      return undefined;
    }
    const handleChange = event => {
      const next = normalizeDifficulty(event.target.value, DEFAULT_DIFFICULTY);
      setDifficulty(next);
      setResetKey(key => key + 1);
    };
    select.addEventListener('change', handleChange);
    return () => {
      select.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    const select = document.getElementById('nonogramDifficulty');
    if(select && select.value !== difficulty){
      select.value = difficulty;
    }
  }, [difficulty]);

  useEffect(() => {
    const button = document.getElementById('nonogramStart');
    if(!button){
      return undefined;
    }
    const handleClick = () => setResetKey(key => key + 1);
    button.addEventListener('click', handleClick);
    return () => {
      button.removeEventListener('click', handleClick);
    };
  }, []);

  const clampSupported = useMemo(() => {
    if(typeof window === 'undefined' || typeof window.CSS === 'undefined' || typeof window.CSS.supports !== 'function'){
      return false;
    }
    return window.CSS.supports('width', 'clamp(1px, 2px, 3px)');
  }, []);

  const [fallbackCellSize, setFallbackCellSize] = useState(() => (
    clampSupported ? null : calculateFallbackCellSize(rows, cols)
  ));

  useEffect(() => {
    if(clampSupported || typeof window === 'undefined'){
      return;
    }
    const updateSize = () => {
      setFallbackCellSize(calculateFallbackCellSize(rows, cols));
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [clampSupported, rows, cols]);

  const cellSize = useMemo(() => (
    clampSupported
      ? `clamp(${MIN_CELL_SIZE}px, calc(${BOARD_WIDTH_RATIO * 100}vw / ${Math.max(rows, cols) + BOARD_PADDING_CELLS}), ${MAX_CELL_SIZE}px)`
      : fallbackCellSize || `${MIN_CELL_SIZE}px`
  ), [clampSupported, fallbackCellSize, rows, cols]);

  const boardStyle = useMemo(() => ({
    '--nonogram-cell-size': cellSize,
    '--nonogram-cell-gap': '4px',
    '--nonogram-layout-gap': '12px',
    '--nonogram-clue-gap': '8px',
    '--nonogram-clue-number-gap': '6px',
    '--nonogram-clue-font': 'clamp(0.7rem, 1.4vw, 0.95rem)',
    '--nonogram-columns': String(cols),
    '--nonogram-rows': String(rows)
  }), [cellSize, rows, cols]);

  const timerLabel = formatNonogramTime(Math.floor(elapsed / 1000));
  const bestLabel = personalBest ? formatNonogramTime(personalBest) : '--';

  const toolButtons = [
    { id: 'mark', icon: '✕', label: 'Leerfeld markieren' },
    { id: 'fill', icon: '🟦', label: 'Feld füllen' },
    { id: 'clear', icon: '🧽', label: 'Radieren' }
  ];

  return html`
    <div>
      <div className="panel nonogram-panel">
        <div className="controls" style=${{ justifyContent: 'center', margin: '0 0 12px', gap: '16px' }}>
          <span className="timer">Zeit: ${timerLabel}</span>
          <span className="timer">Best: ${bestLabel}</span>
        </div>
        <div className="nonogram-board">
          <div className="nonogram-grid" style=${boardStyle}>
            <div className="nonogram-grid__corner" aria-hidden="true"></div>
            <${GridHints} orientation="cols" clues=${colClues} completed=${derived.colComplete} />
            <${GridHints} orientation="rows" clues=${rowClues} completed=${derived.rowComplete} />
            <div className="nonogram-cells">
              ${board.map((rowCells, rowIndex) => rowCells.map((cell, colIndex) => html`
                <${NonogramCell}
                  key=${`${rowIndex}-${colIndex}`}
                  row=${rowIndex}
                  col=${colIndex}
                  state=${cell}
                  activeTool=${activeTool}
                  disabled=${!running || paused || completed}
                  onAction=${handleAction}
                  error=${derived.errors.has(`${rowIndex}-${colIndex}`)}
                  maxRows=${rows}
                  maxCols=${cols}
                  rowComplete=${derived.rowComplete[rowIndex]}
                  colComplete=${derived.colComplete[colIndex]}
                />
              `))}
            </div>
          </div>
        </div>
        <div className="nonogram-tools" style=${{ marginTop: '18px' }}>
          ${toolButtons.map(tool => html`
            <button
              key=${tool.id}
              type="button"
              className=${`nonogram-tool${activeTool === tool.id ? ' selected' : ''}`}
              onClick=${() => setActiveTool(tool.id)}
              aria-pressed=${activeTool === tool.id ? 'true' : 'false'}
              aria-label=${tool.label}
              title=${tool.label}
            >
              <span className="icon" aria-hidden="true">${tool.icon}</span>
            </button>
          `)}
        </div>
      </div>
      <div className="panel panel--info" style=${{ marginTop: '16px' }}>
        <div className="panel__header">
          <h3>So funktioniert's</h3>
        </div>
        <p>Die Zahlen am Rand zeigen, wie viele aufeinanderfolgende Felder in der jeweiligen Reihe oder Spalte gefüllt werden müssen.</p>
        <p>Tippe auf ein Werkzeug (✕, ausgefülltes Feld oder Radiergummi) und anschließend auf das Spielfeld, um Felder zu markieren, zu füllen oder zurückzusetzen.</p>
      </div>
      <${CompletionOverlay}
        visible=${overlayVisible}
        info=${overlayInfo}
        onRestart=${() => {
          setOverlayVisible(false);
          setOverlayInfo(null);
          restart();
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
  const difficultySelect = document.getElementById('nonogramDifficulty');
  const initialDifficulty = difficultySelect ? normalizeDifficulty(difficultySelect.value, DEFAULT_DIFFICULTY) : DEFAULT_DIFFICULTY;
  if(difficultySelect && difficultySelect.value !== initialDifficulty){
    difficultySelect.value = initialDifficulty;
  }
  const root = createRoot(container);
  const controllerRef = React.createRef();
  root.render(html`<${NonogramApp} initialDifficulty=${initialDifficulty} ref=${controllerRef} />`);

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
