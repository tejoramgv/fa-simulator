export function createDFA(states, alphabet, transitions, start, accept) {
  return {
    type: 'DFA',
    states,
    alphabet,
    transitions,
    start,
    accept
  };
}

export function dfaToNFA(dfa) {
  return {
    type: 'NFA',
    states: [...dfa.states],
    alphabet: [...dfa.alphabet],
    transitions: Object.fromEntries(
      Object.entries(dfa.transitions).map(([state, trans]) => [
        state,
        Object.fromEntries(
          Object.entries(trans).map(([symbol, nextState]) => [symbol, [nextState]])
        )
      ])
    ),
    start: dfa.start,
    accept: [...dfa.accept]
  };
}

export function simulateDFA(dfa, input) {
  let currentState = dfa.start;
  const path = [{ state: currentState, symbol: '', step: 0 }];
  
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const nextState = dfa.transitions[currentState]?.[symbol];
    
    if (!nextState) {
      return {
        accepted: false,
        currentState: currentState,
        path,
        error: `No transition from ${currentState} on symbol '${symbol}'`
      };
    }
    
    currentState = nextState;
    path.push({ state: currentState, symbol, step: i + 1 });
  }
  
  const accepted = dfa.accept.includes(currentState);
  return { accepted, currentState, path };
}

export function getTransitionTable(dfa) {
  const table = [];
  const symbols = dfa.alphabet;
  
  for (const state of dfa.states) {
    const row = { state };
    for (const symbol of symbols) {
      const nextState = dfa.transitions[state]?.[symbol] || '—';
      row[symbol] = nextState;
    }
    row.isStart = state === dfa.start;
    row.isAccept = dfa.accept.includes(state);
    table.push(row);
  }
  
  return { table, symbols };
}

export function findReachableStates(dfa) {
  const reachable = new Set();
  const stack = [dfa.start];
  
  while (stack.length > 0) {
    const state = stack.pop();
    if (reachable.has(state)) continue;
    reachable.add(state);
    
    const transitions = dfa.transitions[state] || {};
    for (const symbol of Object.keys(transitions)) {
      const nextState = transitions[symbol];
      if (!reachable.has(nextState)) {
        stack.push(nextState);
      }
    }
  }
  
  return Array.from(reachable);
}

export function generateDFAFromPattern(pattern) {
  const normalizedPattern = pattern.toLowerCase().trim();
  
  if (normalizedPattern.includes('ending with')) {
    const endSeq = extractSequence(normalizedPattern);
    return generateEndsWithDFA(endSeq);
  }
  
  if (normalizedPattern.includes('starting with')) {
    const startSeq = extractSequence(normalizedPattern);
    return generateStartsWithDFA(startSeq);
  }
  
  if (normalizedPattern.includes('even number of')) {
    const symbol = extractSymbol(normalizedPattern);
    return generateEvenCountDFA(symbol);
  }
  
  if (normalizedPattern.includes('odd number of')) {
    const symbol = extractSymbol(normalizedPattern);
    return generateOddCountDFA(symbol);
  }
  
  if (normalizedPattern.includes('contains')) {
    const seq = extractSequence(normalizedPattern);
    return generateContainsDFA(seq);
  }
  
  if (normalizedPattern.includes('divisible by')) {
    const num = extractNumber(normalizedPattern);
    return generateDivisibleByDFA(num);
  }
  
  if (normalizedPattern === 'any string' || normalizedPattern.includes('any')) {
    return generateAnyStringDFA();
  }
  
  if (normalizedPattern === 'empty string' || normalizedPattern.includes('empty')) {
    return generateEmptyStringDFA();
  }
  
  return generateDefaultDFA();
}

function extractSequence(pattern) {
  const match = pattern.match(/'(.+?)'/);
  if (match) return match[1];
  
  const seqMatch = pattern.match(/(\d+)/);
  if (seqMatch) return seqMatch[1];
  
  return '01';
}

function extractSymbol(pattern) {
  const match = pattern.match(/'(.)'/);
  if (match) return match[1];
  
  const symbolMatch = pattern.match(/of\s+(\w)/);
  if (symbolMatch) return symbolMatch[1];
  
  return '0';
}

function extractNumber(pattern) {
  const match = pattern.match(/(\d+)/);
  return match ? parseInt(match[1]) : 3;
}

function generateEndsWithDFA(seq) {
  const states = [];
  const numStates = seq.length + 1;
  
  for (let i = 0; i < numStates; i++) {
    states.push(`q${i}`);
  }
  
  const transitions = {};
  
  for (let i = 0; i < numStates; i++) {
    transitions[states[i]] = {};
    for (const sym of ['0', '1']) {
      if (i === seq.length) {
        let j = seq.length - 1;
        while (j >= 0 && seq[j] !== sym) {
          j--;
        }
        transitions[states[i]][sym] = j >= 0 ? states[j + 1] : states[0];
      } else if (i < seq.length && sym === seq[i]) {
        transitions[states[i]][sym] = states[i + 1];
      } else {
        let j = i - 1;
        while (j >= 0 && seq[j] !== sym) {
          j--;
        }
        transitions[states[i]][sym] = j >= 0 ? states[j + 1] : states[0];
      }
    }
  }
  
  return createDFA(states, ['0', '1'], transitions, states[0], [states[seq.length]]);
}

function generateStartsWithDFA(seq) {
  return generateEndsWithDFA(seq);
}

function generateEvenCountDFA(symbol) {
  const states = ['even', 'odd'];
  const transitions = {
    even: { [symbol]: 'odd', [symbol === '0' ? '1' : '0']: 'even' },
    odd: { [symbol]: 'even', [symbol === '0' ? '1' : '0']: 'odd' }
  };
  
  return createDFA(states, ['0', '1'], transitions, 'even', ['even']);
}

function generateOddCountDFA(symbol) {
  const states = ['even', 'odd'];
  const transitions = {
    even: { [symbol]: 'odd', [symbol === '0' ? '1' : '0']: 'even' },
    odd: { [symbol]: 'even', [symbol === '0' ? '1' : '0']: 'odd' }
  };
  
  return createDFA(states, ['0', '1'], transitions, 'even', ['odd']);
}

function generateContainsDFA(seq) {
  const states = [];
  const numStates = seq.length + 1;
  
  for (let i = 0; i < numStates; i++) {
    states.push(`q${i}`);
  }
  
  const transitions = {};
  
  for (let i = 0; i < numStates; i++) {
    transitions[states[i]] = {};
    for (const sym of ['0', '1']) {
      if (i < seq.length && sym === seq[i]) {
        transitions[states[i]][sym] = states[i + 1];
      } else if (i === numStates - 1) {
        transitions[states[i]][sym] = states[i];
      } else {
        let j = 0;
        while (j < seq.length && seq[j] !== sym) {
          j++;
        }
        transitions[states[i]][sym] = states[0];
      }
    }
  }
  
  return createDFA(states, ['0', '1'], transitions, states[0], [states[numStates - 1]]);
}

function generateDivisibleByDFA(n) {
  const states = [];
  for (let i = 0; i < n; i++) {
    states.push(`q${i}`);
  }
  
  const transitions = {};
  
  for (let i = 0; i < n; i++) {
    transitions[states[i]] = {};
    const nextState = (i * 2) % n;
    transitions[states[i]]['0'] = states[nextState];
    transitions[states[i]]['1'] = states[(nextState + 1) % n];
  }
  
  return createDFA(states, ['0', '1'], transitions, states[0], [states[0]]);
}

function generateAnyStringDFA() {
  const transitions = {
    q0: { '0': 'q0', '1': 'q0' }
  };
  return createDFA(['q0'], ['0', '1'], transitions, 'q0', ['q0']);
}

function generateEmptyStringDFA() {
  const transitions = {
    q0: { '0': 'q1', '1': 'q1' },
    q1: { '0': 'q1', '1': 'q1' }
  };
  return createDFA(['q0', 'q1'], ['0', '1'], transitions, 'q0', ['q0']);
}

function generateDefaultDFA() {
  const transitions = {
    q0: { '0': 'q1', '1': 'q0' },
    q1: { '0': 'q0', '1': 'q1' }
  };
  return createDFA(['q0', 'q1'], ['0', '1'], transitions, 'q0', ['q0']);
}