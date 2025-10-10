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
const PREFERRED_DEFAULT_DIFFICULTY = 'hard';
const DEFAULT_DIFFICULTY = NONOGRAM_DIFFICULTIES.includes(PREFERRED_DEFAULT_DIFFICULTY)
  ? PREFERRED_DEFAULT_DIFFICULTY
  : NONOGRAM_DIFFICULTIES[0] || 'easy';
const MIN_CELL_SIZE = 20;
const MIN_CELL_SIZE_COMPACT = 12;
const MAX_CELL_SIZE = 52;
const BOARD_PADDING_CELLS = 6;
const BOARD_PADDING_CELLS_COMPACT = 10;
const COMPACT_BREAKPOINT = 640;
const BOARD_WIDTH_RATIO = 0.92;
const BOARD_HEIGHT_RATIO = 0.82;
const PROGRESS_KEY_PREFIX = 'nonogram_board_v1';
const ACTIVE_PUZZLE_KEY_PREFIX = 'nonogram_active_puzzle_v1';
const VALID_CELL_STATES = new Set(['empty', 'filled', 'marked']);
const AVAILABLE_TOOLS = ['mark', 'fill'];

function progressKeyForPuzzle(puzzle){
  if(!puzzle || !puzzle.id){
    return null;
  }
  return `${PROGRESS_KEY_PREFIX}_${puzzle.id}`;
}

function activePuzzleKeyForDifficulty(difficulty){
  const normalized = normalizeDifficulty(difficulty, DEFAULT_DIFFICULTY);
  return `${ACTIVE_PUZZLE_KEY_PREFIX}_${normalized}`;
}

function sanitizeStoredPuzzleMetadata(value){
  if(!value || typeof value !== 'object'){
    return null;
  }
  const id = typeof value.id === 'string' && value.id.trim() ? value.id.trim() : null;
  if(!id){
    return null;
  }
  const normalizedDifficulty = normalizeDifficulty(value.difficulty, DEFAULT_DIFFICULTY);
  const grid = Array.isArray(value.grid) ? value.grid : null;
  if(!grid || grid.length === 0){
    return null;
  }
  let cols = null;
  const sanitizedGrid = [];
  for(const row of grid){
    if(!Array.isArray(row) || row.length === 0){
      return null;
    }
    if(cols == null){
      cols = row.length;
      if(cols <= 0){
        return null;
      }
    }else if(row.length !== cols){
      return null;
    }
    const sanitizedRow = row.map(cell => Number(cell) === 1 ? 1 : 0);
    sanitizedGrid.push(sanitizedRow);
  }
  const title = typeof value.title === 'string' && value.title.trim() ? value.title : null;
  return {
    id,
    difficulty: normalizedDifficulty,
    grid: sanitizedGrid,
    title
  };
}

function readStoredActivePuzzle(difficulty){
  if(typeof window === 'undefined'){
    return null;
  }
  const key = activePuzzleKeyForDifficulty(difficulty);
  try {
    const raw = localStorage.getItem(key);
    if(!raw){
      return null;
    }
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeStoredPuzzleMetadata(parsed);
    if(!sanitized || sanitized.difficulty !== normalizeDifficulty(difficulty, DEFAULT_DIFFICULTY)){
      localStorage.removeItem(key);
      return null;
    }
    return sanitized;
  }catch(error){
    console.warn('Fehler beim Laden des Nonogramm-Puzzles:', error);
    localStorage.removeItem(key);
    return null;
  }
}

function writeStoredActivePuzzle(puzzle, difficulty){
  if(typeof window === 'undefined'){
    return;
  }
  const key = activePuzzleKeyForDifficulty(difficulty);
  if(!puzzle || typeof puzzle.id !== 'string' || !Array.isArray(puzzle.grid)){
    localStorage.removeItem(key);
    return;
  }
  const payload = {
    id: puzzle.id,
    difficulty: normalizeDifficulty(difficulty, DEFAULT_DIFFICULTY),
    grid: puzzle.grid.map(row => Array.isArray(row) ? row.map(cell => Number(cell) === 1 ? 1 : 0) : []),
    title: typeof puzzle.title === 'string' ? puzzle.title : null
  };
  const sanitized = sanitizeStoredPuzzleMetadata(payload);
  if(!sanitized){
    localStorage.removeItem(key);
    return;
  }
  try {
    localStorage.setItem(key, JSON.stringify(sanitized));
  }catch(error){
    console.warn('Fehler beim Speichern des Nonogramm-Puzzles:', error);
  }
}

function clearStoredActivePuzzle(difficulty){
  if(typeof window === 'undefined'){
    return;
  }
  try {
    localStorage.removeItem(activePuzzleKeyForDifficulty(difficulty));
  }catch(error){
    console.warn('Fehler beim Entfernen des Nonogramm-Puzzles:', error);
  }
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

function isCompactViewport(width){
  return Number.isFinite(width) && width > 0 && width <= COMPACT_BREAKPOINT;
}

function sumDigits(values){
  if(!Array.isArray(values) || values.length === 0){
    return 0;
  }
  return values.reduce((total, value) => {
    const safe = Math.max(0, Number.isFinite(value) ? Math.floor(value) : 0);
    return total + String(safe).length;
  }, 0);
}

function estimateRowHintUnits(rowClues){
  if(!Array.isArray(rowClues) || rowClues.length === 0){
    return 2;
  }
  let maxUnits = 2;
  for(const clues of rowClues){
    if(!Array.isArray(clues) || clues.length === 0){
      maxUnits = Math.max(maxUnits, 1.6);
      continue;
    }
    const digits = sumDigits(clues);
    const separators = Math.max(0, clues.length - 1);
    const units = 1.6 + digits * 0.55 + separators * 0.35;
    maxUnits = Math.max(maxUnits, units);
  }
  return maxUnits;
}

function estimateColumnHintUnits(colClues){
  if(!Array.isArray(colClues) || colClues.length === 0){
    return 2;
  }
  let maxUnits = 2;
  for(const clues of colClues){
    if(!Array.isArray(clues) || clues.length === 0){
      maxUnits = Math.max(maxUnits, 1.6);
      continue;
    }
    const digits = sumDigits(clues);
    const separators = Math.max(0, clues.length - 1);
    const units = 1.6 + digits * 0.5 + separators * 0.3;
    maxUnits = Math.max(maxUnits, units);
  }
  return maxUnits;
}

function calculateResponsiveCellSize(rows, cols, rowClues, colClues, availableWidth = null, availableHeight = null){
  if(typeof window === 'undefined'){
    return `${MIN_CELL_SIZE}px`;
  }
  const viewportWidth = Math.max(
    window.innerWidth || 0,
    (window.document && window.document.documentElement && window.document.documentElement.clientWidth) || 0,
    (window.screen && window.screen.width) || 0
  );
  const viewportHeight = Math.max(
    window.innerHeight || 0,
    (window.document && window.document.documentElement && window.document.documentElement.clientHeight) || 0,
    (window.screen && window.screen.height) || 0
  );
  const compact = isCompactViewport(viewportWidth);
  const widthPadding = compact ? BOARD_PADDING_CELLS_COMPACT : BOARD_PADDING_CELLS;
  const heightPadding = compact ? BOARD_PADDING_CELLS_COMPACT : BOARD_PADDING_CELLS;
  const rowHintUnits = estimateRowHintUnits(rowClues);
  const colHintUnits = estimateColumnHintUnits(colClues);
  const widthDenominator = cols + rowHintUnits + widthPadding;
  const heightDenominator = rows + colHintUnits + heightPadding;
  if(widthDenominator <= 0 || heightDenominator <= 0){
    return `${MIN_CELL_SIZE}px`;
  }
  const effectiveWidth = Number.isFinite(availableWidth) && availableWidth > 0
    ? availableWidth
    : viewportWidth > 0
      ? viewportWidth * BOARD_WIDTH_RATIO
      : null;
  const effectiveHeight = Number.isFinite(availableHeight) && availableHeight > 0
    ? availableHeight
    : viewportHeight > 0
      ? viewportHeight * BOARD_HEIGHT_RATIO
      : null;
  const widthBased = Number.isFinite(effectiveWidth) && effectiveWidth > 0
    ? effectiveWidth / widthDenominator
    : Number.POSITIVE_INFINITY;
  const heightBased = Number.isFinite(effectiveHeight) && effectiveHeight > 0
    ? effectiveHeight / heightDenominator
    : Number.POSITIVE_INFINITY;
  const candidates = [widthBased, heightBased].filter(value => Number.isFinite(value) && value > 0);
  if(candidates.length === 0){
    return `${MIN_CELL_SIZE}px`;
  }
  const raw = Math.min(...candidates);
  const minSize = compact ? MIN_CELL_SIZE_COMPACT : MIN_CELL_SIZE;
  const clamped = Math.min(MAX_CELL_SIZE, Math.max(minSize, raw));
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
  if(typeof document === 'undefined'){
    return null;
  }
  const gaveUp = info?.gaveUp ?? false;
  const time = Number.isFinite(info?.time) ? info.time : null;
  const personalBest = Number.isFinite(info?.personalBest) ? info.personalBest : null;
  const leaderboardBest = Number.isFinite(info?.leaderboardBest) ? info.leaderboardBest : null;
  const showTime = !gaveUp && Number.isFinite(time);
  const personalBestLabel = personalBest ? formatNonogramTime(personalBest) : '--';
  const leaderboardLabel = leaderboardBest ? formatNonogramTime(leaderboardBest) : '--';
  const timeLabel = showTime ? formatNonogramTime(time) : '--';

  return createPortal(html`
    <div
      id="nonogramOverlay"
      className=${visible ? 'show' : ''}
      aria-hidden=${visible ? 'false' : 'true'}
    >
      <div className="overlay-card" role="dialog" aria-modal="true" aria-labelledby="nonogramOvTitle">
        <h2 id="nonogramOvTitle">${gaveUp ? '🧩 Rätsel angezeigt' : '🎉 Nonogramm gelöst!'}</h2>
        <p>${gaveUp ? 'Du kannst jederzeit ein neues Rätsel starten.' : 'Starke Leistung – weiter so!'}</p>
        ${showTime ? html`<p>Deine Zeit: <b id="nonogramOvTime">${timeLabel}</b></p>` : null}
        <p>Beste Zeit: <b id="nonogramOvBest">${personalBestLabel}</b></p>
        ${leaderboardBest ? html`<p>Top-Zeit (Leaderboard): <b>${leaderboardLabel}</b></p>` : null}
        <div className="buttons" style=${{ justifyContent: 'center', marginTop: '12px' }}>
          <button type="button" className="button-primary" onClick=${onRestart}>
            <span className="icon" aria-hidden="true">↻</span> ${gaveUp ? 'Neues Rätsel' : 'Noch einmal'}
          </button>
          <button type="button" onClick=${onClose}>
            <span className="icon" aria-hidden="true">✕</span> Schließen
          </button>
        </div>
        <div className="panel panel--info" style=${{ marginTop: '16px' }}>
          <div className="panel__header">
            <h3>Top-Zeiten</h3>
          </div>
          <table className="table" id="nonogramOvTable">
            <thead>
              <tr><th>#</th><th>Name</th><th>Zeit</th><th>Datum</th></tr>
            </thead>
            <tbody></tbody>
          </table>
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
  onDragStart,
  onDragEnter,
  onDragEnd,
  error,
  maxRows,
  maxCols,
  rowComplete,
  colComplete
}){
  const pointerRef = useRef({
    draggingTool: null
  });

  const handlePointerDown = useCallback(event => {
    if(disabled) return;
    const isTouch = event.pointerType === 'touch';
    if(!isTouch && event.button !== 0) return;
    pointerRef.current.draggingTool = activeTool;
    onAction(row, col, activeTool, 'toggle');
    onDragStart(activeTool);
    if(isTouch){
      event.preventDefault();
    }
  }, [disabled, row, col, onAction, activeTool, onDragStart]);

  const handlePointerUp = useCallback(event => {
    if(disabled) return;
    pointerRef.current.draggingTool = null;
    onDragEnd();
  }, [disabled, onDragEnd]);

  const handlePointerEnter = useCallback(event => {
    if(disabled) return;
    if(pointerRef.current.draggingTool){
      if(event.pointerType !== 'touch' && event.buttons === 0){
        pointerRef.current.draggingTool = null;
        onDragEnd();
        return;
      }
      onDragEnter(row, col, pointerRef.current.draggingTool);
    }
  }, [disabled, row, col, onDragEnter, onDragEnd]);

  const handlePointerCancel = useCallback(() => {
    pointerRef.current.draggingTool = null;
    onDragEnd();
  }, [onDragEnd]);

  const handleClick = useCallback(event => {
    if(disabled) return;
    if(event.detail !== 0){
      event.preventDefault();
      return;
    }
    onAction(row, col, activeTool, 'toggle');
  }, [disabled, row, col, onAction, activeTool]);

  const handleContextMenu = useCallback(event => {
    event.preventDefault();
    if(disabled) return;
    onAction(row, col, 'mark', 'toggle');
  }, [disabled, row, col, onAction]);

  const handleAuxClick = useCallback(event => {
    if(event.button !== 1) return;
    event.preventDefault();
    if(disabled) return;
    onAction(row, col, 'clear', 'toggle');
  }, [disabled, row, col, onAction]);

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
      onPointerEnter=${handlePointerEnter}
      onPointerCancel=${handlePointerCancel}
    >
      ${state === 'marked' ? html`<span className="nonogram-cell__mark" aria-hidden="true">✕</span>` : null}
    </button>
  `;
}

const NonogramApp = React.forwardRef(function NonogramApp({ initialDifficulty }, ref){
  const [difficulty, setDifficulty] = useState(() => normalizeDifficulty(initialDifficulty, DEFAULT_DIFFICULTY));
  const [resetKey, setResetKey] = useState(0);
  const [puzzle, setPuzzle] = useState(() => {
    const stored = readStoredActivePuzzle(difficulty);
    if(stored){
      return {
        id: stored.id,
        title: stored.title || null,
        grid: stored.grid.map(row => row.slice())
      };
    }
    return getNonogramPuzzle(difficulty);
  });
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
  const handleToolSelect = useCallback(tool => {
    setActiveTool(AVAILABLE_TOOLS.includes(tool) ? tool : 'fill');
  }, []);

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
    const stored = readStoredActivePuzzle(difficulty);
    if(stored){
      setPuzzle({
        id: stored.id,
        title: stored.title || null,
        grid: stored.grid.map(row => row.slice())
      });
    }else{
      setPuzzle(getNonogramPuzzle(difficulty));
    }
  }, [difficulty, resetKey]);

  useEffect(() => {
    setPersonalBest(readPersonalBest(difficulty));
    setLeaderboardBest(getBestTime(difficulty));
    renderHS(difficulty, { tableSelector: '#nonogramScoreTable' });
    renderHS(difficulty, { tableSelector: '#nonogramOvTable' });
  }, [difficulty]);

  useEffect(() => {
    if(typeof window === 'undefined' || !progressKey){
      clearStoredActivePuzzle(difficulty);
      return;
    }
    if(completed){
      localStorage.removeItem(progressKey);
      clearStoredActivePuzzle(difficulty);
      return;
    }
    try {
      localStorage.setItem(progressKey, JSON.stringify(board));
    }catch(error){
      console.warn('Fehler beim Speichern des Nonogramms:', error);
    }
    writeStoredActivePuzzle(puzzle, difficulty);
  }, [board, completed, progressKey, puzzle, difficulty]);

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
        }else if(current !== 'marked'){
          hasMissing = true;
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

  const progressPercent = useMemo(() => {
    const raw = Number.isFinite(derived.progress) ? derived.progress * 100 : 0;
    if(!Number.isFinite(raw)){
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round(raw)));
  }, [derived.progress]);

  const progressLabel = useMemo(() => {
    if(requiredCells <= 0){
      return 'Fortschritt: --';
    }
    return `Fortschritt: ${progressPercent}%`;
  }, [progressPercent, requiredCells]);

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
      clearStoredActivePuzzle(difficulty);
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
        renderHS(difficulty, { tableSelector: '#nonogramOvTable' });
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

  const handleAction = useCallback((row, col, action, mode = 'toggle') => {
    if(!running || paused || completed){
      return;
    }
    setBoard(prev => {
      const current = prev[row]?.[col];
      let next = current;
      if(action === 'fill'){
        if(mode === 'set'){
          next = 'filled';
        }else if(mode === 'clear'){
          next = 'empty';
        }else{
          next = current === 'filled' ? 'empty' : 'filled';
        }
      }else if(action === 'mark'){
        if(mode === 'set'){
          next = 'marked';
        }else if(mode === 'clear'){
          next = 'empty';
        }else{
          next = current === 'marked' ? 'empty' : 'marked';
        }
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

  const dragStateRef = useRef({ active: false, tool: null });

  const beginDrag = useCallback(tool => {
    if(!running || paused || completed){
      return;
    }
    dragStateRef.current.active = true;
    dragStateRef.current.tool = tool;
  }, [running, paused, completed]);

  const dragOver = useCallback((row, col, tool) => {
    const state = dragStateRef.current;
    const currentTool = tool || state.tool;
    if(!state.active || !currentTool){
      return;
    }
    handleAction(row, col, currentTool, 'set');
  }, [handleAction]);

  const endDrag = useCallback(() => {
    dragStateRef.current.active = false;
    dragStateRef.current.tool = null;
  }, []);

  useEffect(() => {
    const handlePointerUp = () => {
      endDrag();
    };
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [endDrag]);

  const restart = useCallback(() => {
    if(progressKey && typeof window !== 'undefined'){
      localStorage.removeItem(progressKey);
    }
    clearStoredActivePuzzle(difficulty);
    setResetKey(key => key + 1);
  }, [progressKey, difficulty]);

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
      renderHS(difficulty, { tableSelector: '#nonogramScoreTable' });
      renderHS(difficulty, { tableSelector: '#nonogramOvTable' });
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
    const handleClick = () => {
      restart();
    };
    button.addEventListener('click', handleClick);
    return () => {
      button.removeEventListener('click', handleClick);
    };
  }, [restart]);

  const boardContainerRef = useRef(null);
  const [cellSize, setCellSize] = useState(() => calculateResponsiveCellSize(rows, cols, rowClues, colClues));
  const [compactLayout, setCompactLayout] = useState(() => {
    if(typeof window === 'undefined'){
      return false;
    }
    const width = Math.max(
      window.innerWidth || 0,
      (window.document && window.document.documentElement && window.document.documentElement.clientWidth) || 0,
      (window.screen && window.screen.width) || 0
    );
    return isCompactViewport(width);
  });

  useEffect(() => {
    if(typeof window === 'undefined'){
      return undefined;
    }
    const extractAvailableSpace = element => {
      if(!element){
        return { width: null, height: null };
      }
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const paddingX = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
      const paddingY = (Number.parseFloat(style.paddingTop) || 0) + (Number.parseFloat(style.paddingBottom) || 0);
      return {
        width: Math.max(0, rect.width - paddingX),
        height: Math.max(0, rect.height - paddingY)
      };
    };
    const updateLayout = () => {
      const { width, height } = extractAvailableSpace(boardContainerRef.current);
      setCellSize(calculateResponsiveCellSize(rows, cols, rowClues, colClues, width, height));
      const widthViewport = Math.max(
        window.innerWidth || 0,
        (window.document && window.document.documentElement && window.document.documentElement.clientWidth) || 0,
        (window.screen && window.screen.width) || 0
      );
      setCompactLayout(isCompactViewport(widthViewport));
    };
    updateLayout();
    const element = boardContainerRef.current;
    let resizeObserver = null;
    if(element && typeof ResizeObserver === 'function'){
      resizeObserver = new ResizeObserver(() => updateLayout());
      resizeObserver.observe(element);
    }
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);
    return () => {
      if(resizeObserver){
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, [rows, cols, rowClues, colClues]);

  const boardStyle = useMemo(() => ({
    '--nonogram-cell-size': cellSize,
    '--nonogram-cell-gap': compactLayout ? '4px' : '6px',
    '--nonogram-layout-gap': compactLayout ? '10px' : '12px',
    '--nonogram-clue-gap': compactLayout ? '6px' : '8px',
    '--nonogram-clue-number-gap': compactLayout ? '4px' : '6px',
    '--nonogram-clue-font': compactLayout ? 'clamp(0.6rem, 2.2vw, 0.85rem)' : 'clamp(0.7rem, 1.2vw, 0.9rem)',
    '--nonogram-clue-padding': compactLayout ? '4px 8px' : '6px 10px',
    '--nonogram-clue-radius': compactLayout ? '12px' : '14px',
    '--nonogram-grid-padding': compactLayout ? 'clamp(6px, 1.1vw, 14px)' : 'clamp(8px, 1.8vw, 18px)',
    '--nonogram-grid-radius': compactLayout ? '18px' : '22px',
    '--nonogram-cells-radius': compactLayout ? '14px' : '18px',
    '--nonogram-cells-padding': compactLayout ? '3px' : '4px',
    '--nonogram-columns': String(cols),
    '--nonogram-rows': String(rows)
  }), [cellSize, compactLayout, rows, cols]);

  const timerLabel = formatNonogramTime(Math.floor(elapsed / 1000));
  const bestLabel = personalBest ? formatNonogramTime(personalBest) : '--';

  const toolButtons = [
    { id: 'mark', icon: '✕', label: 'Leerfeld markieren' },
    { id: 'fill', icon: '🟦', label: 'Feld füllen oder leeren' }
  ];

  return html`
    <div>
      <div className="panel nonogram-panel">
        <div className="controls" style=${{ justifyContent: 'center', margin: '0 0 12px', gap: '16px' }}>
          <span className="timer">Zeit: ${timerLabel}</span>
          <span className="timer">Best: ${bestLabel}</span>
          <span
            className="timer"
            aria-live="polite"
            aria-atomic="true"
            aria-label=${requiredCells > 0
              ? `Fortschritt: ${progressPercent}% der Pflichtfelder gelöst.`
              : 'Fortschritt: keine Felder erforderlich'}
          >
            ${progressLabel}
          </span>
        </div>
        <div className="nonogram-board" ref=${boardContainerRef}>
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
                onDragStart=${beginDrag}
                onDragEnter=${dragOver}
                onDragEnd=${endDrag}
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
              onClick=${() => handleToolSelect(tool.id)}
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
        <p>Tippe oder klicke auf ein Werkzeug (✕ oder ausgefülltes Feld) und anschließend auf das Spielfeld, um Felder zu markieren oder zu füllen. Ein erneuter Klick mit demselben Werkzeug setzt das Feld zurück.</p>
        <p>Mit Rechtsklick markierst du ein leeres Feld, die mittlere Maustaste löscht ein Feld. Falsche Einträge werden sofort rot hervorgehoben – genau wie im Sudoku.</p>
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
