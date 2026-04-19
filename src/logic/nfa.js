export function createNFA(states, alphabet, transitions, start, accept) {
  return {
    type: 'NFA',
    states,
    alphabet,
    transitions,
    start,
    accept
  };
}

export function nfaToDFA(nfa, showSteps = false) {
  const steps = [];
  
  const epsilonClosure = (statesSet) => {
    const closure = new Set(statesSet);
    const stack = [...statesSet];
    
    while (stack.length > 0) {
      const state = stack.pop();
      const epsilonTransitions = nfa.transitions[state]?.['ε'] || [];
      
      for (const nextState of epsilonTransitions) {
        if (!closure.has(nextState)) {
          closure.add(nextState);
          stack.push(nextState);
        }
      }
    }
    
    return Array.from(closure);
  };
  
  const getEpsilonClosure = (statesSet) => {
    return epsilonClosure(new Set(statesSet));
  };
  
  const startClosure = getEpsilonClosure([nfa.start]);
  const startStateName = `{${startClosure.sort().join(',')}}`;
  
  const newStates = [startStateName];
  const newAccept = [];
  const queue = [startClosure];
  const visited = new Set([startStateName]);
  
  const transitions = {};
  
  if (startClosure.some(s => nfa.accept.includes(s))) {
    newAccept.push(startStateName);
  }
  
  if (showSteps) {
    steps.push({
      description: `Start state: ε-closure({${nfa.start}}) = {${startClosure.sort().join(',')}}`,
      state: startStateName,
      isAccept: newAccept.includes(startStateName)
    });
  }
  
  while (queue.length > 0) {
    const currentClosure = queue.shift();
    const currentStateName = `{${currentClosure.sort().join(',')}}`;
    
    transitions[currentStateName] = {};
    
    for (const symbol of nfa.alphabet) {
      const nextStates = new Set();
      
      for (const state of currentClosure) {
        const symbolTransitions = nfa.transitions[state]?.[symbol] || [];
        for (const nextState of symbolTransitions) {
          const closed = getEpsilonClosure([nextState]);
          for (const s of closed) {
            nextStates.add(s);
          }
        }
      }
      
      if (nextStates.size > 0) {
        const nextStatesArray = Array.from(nextStates).sort();
        const nextStateName = `{${nextStatesArray.join(',')}}`;
        
        transitions[currentStateName][symbol] = nextStateName;
        
        if (!visited.has(nextStateName)) {
          visited.add(nextStateName);
          newStates.push(nextStateName);
          queue.push(nextStatesArray);
          
          if (nextStatesArray.some(s => nfa.accept.includes(s))) {
            newAccept.push(nextStateName);
          }
          
          if (showSteps) {
            steps.push({
              description: `δ(${currentStateName}, ${symbol}) = ε-closure(${nextStatesArray.join(',')}) = {${nextStatesArray.join(',')}}`,
              state: nextStateName,
              isAccept: newAccept.includes(nextStateName)
            });
          }
        }
      } else {
        transitions[currentStateName][symbol] = null;
      }
    }
  }
  
  return {
    type: 'DFA',
    states: newStates,
    alphabet: [...nfa.alphabet],
    transitions,
    start: startStateName,
    accept: newAccept,
    steps
  };
}

export function epsilonNFAtoNFA(enfa, showSteps = false) {
  const steps = [];
  
  const epsilonClosure = (state) => {
    const closure = new Set([state]);
    const stack = [state];
    
    while (stack.length > 0) {
      const currentState = stack.pop();
      const epsilonTransitions = enfa.transitions[currentState]?.['ε'] || [];
      
      for (const nextState of epsilonTransitions) {
        if (!closure.has(nextState)) {
          closure.add(nextState);
          stack.push(nextState);
        }
      }
    }
    
    return Array.from(closure);
  };
  
  const transitions = {};
  
  for (const state of enfa.states) {
    const closure = epsilonClosure(state);
    transitions[state] = {};
    
    for (const symbol of enfa.alphabet) {
      const nextStates = new Set();
      
      for (const s of closure) {
        const symbolTransitions = enfa.transitions[s]?.[symbol] || [];
        for (const nextState of symbolTransitions) {
          nextStates.add(nextState);
        }
      }
      
      if (nextStates.size > 0) {
        transitions[state][symbol] = Array.from(nextStates);
      } else {
        transitions[state][symbol] = [];
      }
    }
    
    if (showSteps) {
      steps.push({
        state,
        closure: closure.sort().join(', '),
        transitions: { ...transitions[state] }
      });
    }
  }
  
  return {
    type: 'NFA',
    states: [...enfa.states],
    alphabet: [...enfa.alphabet],
    transitions,
    start: enfa.start,
    accept: [...enfa.accept],
    steps
  };
}

export function simulateNFA(nfa, input) {
  let currentStates = new Set([nfa.start]);
  
  const epsilonClosure = (statesSet) => {
    const closure = new Set(statesSet);
    const stack = [...statesSet];
    
    while (stack.length > 0) {
      const state = stack.pop();
      const epsilonTransitions = nfa.transitions[state]?.['ε'] || [];
      
      for (const nextState of epsilonTransitions) {
        if (!closure.has(nextState)) {
          closure.add(nextState);
          stack.push(nextState);
        }
      }
    }
    
    return closure;
  };
  
  const path = [{ states: Array.from(currentStates), symbol: '', step: 0 }];
  
  currentStates = epsilonClosure(currentStates);
  
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    const nextStates = new Set();
    
    for (const state of currentStates) {
      const symbolTransitions = nfa.transitions[state]?.[symbol] || [];
      for (const nextState of symbolTransitions) {
        nextStates.add(nextState);
      }
    }
    
    if (nextStates.size === 0) {
      return {
        accepted: false,
        currentStates: Array.from(currentStates),
        path,
        error: `No transitions possible on symbol '${symbol}'`
      };
    }
    
    currentStates = epsilonClosure(nextStates);
    path.push({ states: Array.from(currentStates), symbol, step: i + 1 });
  }
  
  const accepted = Array.from(currentStates).some(state => nfa.accept.includes(state));
  
  return {
    accepted,
    currentStates: Array.from(currentStates),
    path
  };
}

export function getNFATransitionTable(nfa) {
  const table = [];
  const symbols = nfa.alphabet;
  
  for (const state of nfa.states) {
    const row = { state };
    for (const symbol of symbols) {
      const nextStates = nfa.transitions[state]?.[symbol] || [];
      row[symbol] = nextStates.length > 0 ? `{${nextStates.sort().join(',')}}` : '∅';
    }
    row.isStart = state === nfa.start;
    row.isAccept = nfa.accept.includes(state);
    table.push(row);
  }
  
  return { table, symbols };
}

export function createSampleENFA() {
  return {
    type: 'ε-NFA',
    states: ['q0', 'q1', 'q2'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { 'ε': ['q1'], '0': ['q0'] },
      q1: { '1': ['q2'] },
      q2: { '0': ['q2'], '1': ['q2'] }
    },
    start: 'q0',
    accept: ['q2']
  };
}

export function createSampleNFA() {
  return {
    type: 'NFA',
    states: ['q0', 'q1', 'q2'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { '0': ['q0', 'q1'], '1': ['q1'] },
      q1: { '1': ['q2'] },
      q2: { '0': ['q2'], '1': ['q2'] }
    },
    start: 'q0',
    accept: ['q2']
  };
}

export function createSampleDFA() {
  return {
    type: 'DFA',
    states: ['q0', 'q1', 'q2'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { '0': 'q1', '1': 'q0' },
      q1: { '0': 'q2', '1': 'q0' },
      q2: { '0': 'q2', '1': 'q2' }
    },
    start: 'q0',
    accept: ['q2']
  };
}