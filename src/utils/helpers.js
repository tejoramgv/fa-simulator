export function exportToJSON(automaton) {
  return JSON.stringify(automaton, null, 2);
}

export function importFromJSON(jsonString) {
  try {
    const automaton = JSON.parse(jsonString);
    
    if (!automaton.type || !automaton.states || !automaton.alphabet || !automaton.transitions) {
      throw new Error('Invalid automaton format');
    }
    
    if (!automaton.start || !automaton.accept) {
      throw new Error('Missing start or accept states');
    }
    
    return { success: true, automaton };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function validateAutomaton(automaton) {
  const errors = [];
  
  if (!automaton.type) {
    errors.push('Missing automaton type');
  }
  
  if (!automaton.states || !Array.isArray(automaton.states)) {
    errors.push('States must be an array');
  }
  
  if (!automaton.alphabet || !Array.isArray(automaton.alphabet)) {
    errors.push('Alphabet must be an array');
  }
  
  if (automaton.alphabet?.includes('ε')) {
    errors.push('Alphabet cannot contain epsilon (use ε-NFA type)');
  }
  
  if (!automaton.transitions || typeof automaton.transitions !== 'object') {
    errors.push('Transitions must be an object');
  }
  
  if (!automaton.start) {
    errors.push('Missing start state');
  } else if (!automaton.states?.includes(automaton.start)) {
    errors.push('Start state not in states list');
  }
  
  if (!automaton.accept || !Array.isArray(automaton.accept)) {
    errors.push('Accept states must be an array');
  } else {
    for (const state of automaton.accept) {
      if (!automaton.states?.includes(state)) {
        errors.push(`Accept state "${state}" not in states list`);
      }
    }
  }
  
  for (const state of automaton.states || []) {
    if (!automaton.transitions?.[state]) {
      errors.push(`No transitions defined for state "${state}"`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

export function formatStates(states, separator = ', ') {
  if (!states || states.length === 0) return '∅';
  if (states.length === 1) return states[0];
  return `{${states.join(separator)}}`;
}

export function formatTransitionTable(dfa) {
  const symbols = dfa.alphabet;
  const rows = [];
  
  for (const state of dfa.states) {
    const row = { state };
    for (const symbol of symbols) {
      row[symbol] = dfa.transitions[state]?.[symbol] || '—';
    }
    row.isStart = state === dfa.start;
    row.isAccept = dfa.accept.includes(state);
    rows.push(row);
  }
  
  return { rows, symbols };
}

export function downloadJSON(automaton, filename = 'automaton.json') {
  const json = JSON.stringify(automaton, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(err => {
    console.error('Failed to copy:', err);
  });
}

export function generateNodes(automaton, currentState = null) {
  const nodes = [];
  const statePositions = {};
  
  const n = automaton.states.length;
  const centerX = 400;
  const centerY = 250;
  const radius = Math.min(200, 50 + n * 30);
  
  automaton.states.forEach((state, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    statePositions[state] = { x, y };
    
    const isStart = state === automaton.start;
    const isAccept = automaton.accept.includes(state);
    const isCurrent = state === currentState || 
      (currentState && currentState.includes && currentState.includes(state));
    
    nodes.push({
      id: state,
      position: { x, y },
      data: { label: state },
      type: 'custom',
      className: `state-node ${isAccept ? 'accept' : ''} ${isStart ? 'start' : ''} ${isCurrent ? 'current' : ''}`
    });
  });
  
  return { nodes, statePositions };
}

export function generateEdges(automaton, statePositions) {
  const edges = [];
  const seenEdges = new Set();
  
  for (const [fromState, transitions] of Object.entries(automaton.transitions)) {
    if (!transitions) continue;
    
    for (const [symbol, toStates] of Object.entries(transitions)) {
      const targets = Array.isArray(toStates) ? toStates : [toStates];
      
      for (const toState of targets) {
        if (!toState || !statePositions[toState]) continue;
        
        const edgeKey = `${fromState}->${toState}->${symbol}`;
        if (seenEdges.has(edgeKey)) continue;
        seenEdges.add(edgeKey);
        
        const fromPos = statePositions[fromState];
        const toPos = statePositions[toState];
        
        let sourceHandle = null;
        let targetHandle = null;
        
        if (fromState === toState) {
          sourceHandle = 'right';
          targetHandle = 'right';
        } else {
          const dx = toPos.x - fromPos.x;
          const dy = toPos.y - fromPos.y;
          const angle = Math.atan2(dy, dx);
          
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            sourceHandle = 'right';
            targetHandle = 'right';
          }
        }
        
        edges.push({
          id: edgeKey,
          source: fromState,
          target: toState,
          label: symbol,
          sourceHandle,
          targetHandle,
          type: fromState === toState ? 'self' : 'default',
          animated: false
        });
      }
    }
  }
  
  return edges;
}