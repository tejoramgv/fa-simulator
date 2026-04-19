export function minimizeDFA(dfa, showSteps = false) {
  const steps = [];
  
  const reachable = findReachableStates(dfa);
  const reachableDFA = {
    ...dfa,
    states: reachable,
    transitions: Object.fromEntries(
      reachable.map(s => [s, dfa.transitions[s] || {}])
    )
  };
  
  if (showSteps) {
    steps.push({
      title: 'Remove Unreachable States',
      description: `Found ${reachable.length} reachable states from start state: {${reachable.join(', ')}}`,
      result: { ...reachableDFA }
    });
  }
  
  const partitions = [];
  const acceptingStates = reachableDFA.accept;
  const nonAcceptingStates = reachableDFA.states.filter(s => !acceptingStates.includes(s));
  
  if (acceptingStates.length > 0) {
    partitions.push(new Set(acceptingStates));
  }
  if (nonAcceptingStates.length > 0) {
    partitions.push(new Set(nonAcceptingStates));
  }
  
  if (showSteps) {
    steps.push({
      title: 'Initial Partition',
      description: `P0 = {${partitions.map(p => `{${Array.from(p).join(',')}}`).join(', ')}}`,
      partitions: Array.from(partitions).map(p => Array.from(p))
    });
  }
  
  let changed = true;
  let iteration = 0;
  
  while (changed) {
    iteration++;
    changed = false;
    const newPartitions = [];
    
    for (const partition of partitions) {
      const partitionArray = Array.from(partition);
      const groups = new Map();
      
      for (const state of partitionArray) {
        const signature = reachableDFA.alphabet.map(symbol => {
          const nextState = reachableDFA.transitions[state]?.[symbol];
          if (!nextState) return -1;
          
          for (let i = 0; i < partitions.length; i++) {
            if (partitions[i].has(nextState)) {
              return i;
            }
          }
          return -1;
        }).join(',');
        
        if (!groups.has(signature)) {
          groups.set(signature, []);
        }
        groups.get(signature).push(state);
      }
      
      if (groups.size > 1) {
        changed = true;
        for (const group of groups.values()) {
          newPartitions.push(new Set(group));
        }
      } else {
        newPartitions.push(partition);
      }
    }
    
    if (showSteps) {
      steps.push({
        title: `Iteration ${iteration}`,
        description: `P${iteration} = {${newPartitions.map(p => `{${Array.from(p).join(',')}}`).join(', ')}}`,
        partitions: Array.from(newPartitions).map(p => Array.from(p))
      });
    }
    
    partitions.length = 0;
    partitions.push(...newPartitions);
  }
  
  const stateToRepresentative = new Map();
  
  for (const partition of partitions) {
    const representative = Array.from(partition).sort()[0];
    for (const state of partition) {
      stateToRepresentative.set(state, representative);
    }
  }
  
  const newStates = Array.from(new Set(stateToRepresentative.values())).sort();
  const newTransitions = {};
  const newAccept = [];
  
  for (const state of reachableDFA.states) {
    const newState = stateToRepresentative.get(state);
    const trans = reachableDFA.transitions[state];
    
    if (!newTransitions[newState]) {
      newTransitions[newState] = {};
    }
    
    for (const symbol of reachableDFA.alphabet) {
      const nextState = trans?.[symbol];
      if (nextState) {
        newTransitions[newState][symbol] = stateToRepresentative.get(nextState);
      }
    }
  }
  
  const newStart = stateToRepresentative.get(reachableDFA.start);
  
  for (const state of reachableDFA.accept) {
    const newState = stateToRepresentative.get(state);
    if (!newAccept.includes(newState)) {
      newAccept.push(newState);
    }
  }
  newAccept.sort();
  
  const minimizedDFA = {
    type: 'DFA',
    states: newStates,
    alphabet: [...reachableDFA.alphabet],
    transitions: newTransitions,
    start: newStart,
    accept: newAccept,
    originalStates: reachableDFA.states.length,
    minimizedStates: newStates.length
  };
  
  if (showSteps) {
    steps.push({
      title: 'Minimized DFA',
      description: `Reduced from ${reachableDFA.states.length} states to ${newStates.length} states`,
      result: minimizedDFA
    });
  }
  
  return {
    dfa: minimizedDFA,
    steps,
    original: reachableDFA
  };
}

function findReachableStates(dfa) {
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

export function compareDFAs(original, minimized) {
  const comparison = {
    states: {
      original: original.states.length,
      minimized: minimized.states.length,
      removed: original.states.length - minimized.states.length
    },
    transitions: {
      original: countTransitions(original),
      minimized: countTransitions(minimized)
    },
    statesList: {
      original: original.states,
      minimized: minimized.states
    },
    startState: {
      original: original.start,
      minimized: minimized.start
    },
    acceptStates: {
      original: original.accept,
      minimized: minimized.accept
    }
  };
  
  return comparison;
}

function countTransitions(dfa) {
  let count = 0;
  for (const state of dfa.states) {
    const trans = dfa.transitions[state] || {};
    count += Object.keys(trans).length;
  }
  return count;
}

export function createSampleMinimizableDFA() {
  return {
    type: 'DFA',
    states: ['q0', 'q1', 'q2', 'q3', 'q4', 'q5'],
    alphabet: ['0', '1'],
    transitions: {
      q0: { '0': 'q1', '1': 'q2' },
      q1: { '0': 'q3', '1': 'q4' },
      q2: { '0': 'q3', '1': 'q5' },
      q3: { '0': 'q5', '1': 'q5' },
      q4: { '0': 'q5', '1': 'q5' },
      q5: { '0': 'q5', '1': 'q5' }
    },
    start: 'q0',
    accept: ['q3', 'q4', 'q5']
  };
}

export function createEvenOddMinimizableDFA() {
  return {
    type: 'DFA',
    states: ['a', 'b', 'c', 'd', 'e', 'f'],
    alphabet: ['0', '1'],
    transitions: {
      a: { '0': 'b', '1': 'c' },
      b: { '0': 'd', '1': 'e' },
      c: { '0': 'd', '1': 'e' },
      d: { '0': 'd', '1': 'f' },
      e: { '0': 'd', '1': 'f' },
      f: { '0': 'f', '1': 'f' }
    },
    start: 'a',
    accept: ['d', 'e', 'f']
  };
}