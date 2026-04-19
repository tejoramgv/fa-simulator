let stateCounter = 0;

export function parseRegex(regex) {
  const normalized = regex.replace(/\s+/g, '').replace(/a/g, 'a').replace(/b/g, 'b');
  return normalized;
}

export function tokenizeRegex(regex) {
  const tokens = [];
  let i = 0;
  let lastWasOperand = false;
  
  while (i < regex.length) {
    const char = regex[i];
    let token = null;
    let isOperand = false;
    
    if ('()|'.includes(char)) {
      token = { type: char, value: char };
      isOperand = false;
      i++;
    } else if (char === '*') {
      token = { type: 'star', value: '*' };
      isOperand = true;
      i++;
    } else if (char === '+') {
      token = { type: 'plus', value: '+' };
      isOperand = true;
      i++;
    } else if (char === '?') {
      token = { type: 'question', value: '?' };
      isOperand = true;
      i++;
    } else if (char === 'ε') {
      token = { type: 'epsilon', value: 'ε' };
      isOperand = true;
      i++;
    } else if (/[ab01]/.test(char)) {
      token = { type: 'symbol', value: char };
      isOperand = true;
      i++;
    } else {
      i++;
      continue;
    }
    
    if (token) {
      if (lastWasOperand &&
          token.type !== '|' &&
          token.type !== ')' &&
          token.type !== '(' &&
          ((token.type === 'symbol') ||
           (token.type === 'epsilon'))) {
        tokens.push({ type: '.', value: '.' });
      }
      if (lastWasOperand && token.type === '(') {
        tokens.push({ type: '.', value: '.' });
      }
      tokens.push(token);
      lastWasOperand = isOperand;
    }
  }
  
  return tokens;
}

class ThompsonBuilder {
  constructor() {
    this.states = [];
    this.alphabet = [];
    this.transitions = {};
    this.start = '';
    this.accept = [];
    this.stateCounter = 0;
  }
  
  newState() {
    const state = `q${this.stateCounter++}`;
    this.states.push(state);
    this.transitions[state] = {};
    return state;
  }
  
  build(regex) {
    this.stateCounter = 0;
    this.states = [];
    this.alphabet = [];
    this.transitions = {};
    
    if (!regex || regex === '') {
      const start = this.newState();
      const accept = this.newState();
      this.start = start;
      this.accept = [accept];
      return this.getResult();
    }
    
    const tokens = tokenizeRegex(regex);
    const postfix = this.toPostfix(tokens);
    
    if (postfix.length === 0) {
      const start = this.newState();
      const accept = this.newState();
      this.start = start;
      this.accept = [accept];
      return this.getResult();
    }
    
    const result = this.evaluatePostfix(postfix);
    this.start = result.start;
    this.accept = [result.accept];
    
    return this.getResult();
  }
  
  getResult() {
    return {
      type: 'NFA',
      states: [...this.states],
      alphabet: [...this.alphabet],
      transitions: { ...this.transitions },
      start: this.start,
      accept: [...this.accept]
    };
  }
  
  precedence(op) {
    switch (op) {
      case '|': return 1;
      case '.': return 2;
      case '*':
      case '+':
      case '?':
      case 'star':
      case 'plus':
      case 'question': return 3;
      default: return 0;
    }
  }
  
  toPostfix(tokens) {
    const output = [];
    const operators = [];
    console.log('toPostfix START, tokens:', tokens.map(t => t.type + ':' + t.value).join(', '));
    
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      console.log('toPostfix loop iteration:', i, 'token:', token.type, token.value);
      
      if (token.type === 'symbol' || token.type === 'epsilon') {
        console.log('  -> symbol/epsilon, pushing to output');
        output.push(token);
      } else if (token.type === '(') {
        console.log('  -> (, pushing to operators');
        operators.push(token);
      } else if (token.type === ')') {
        console.log('  -> ), popping until (');
        while (operators.length > 0) {
          const op = operators.pop();
          if (op.type === '(') break;
          output.push(op);
        }
      } else if (['|', '.', 'star', 'plus', 'question'].includes(token.type)) {
        const prec = this.precedence(token.type);
        console.log('  -> operator', token.type, 'prec:', prec, 'before pop ops:', operators.map(o => o.type));
        
        while (operators.length > 0 && 
               this.precedence(operators[operators.length - 1].type) >= prec &&
               operators[operators.length - 1].type !== '(') {
          console.log('  popping op:', operators[operators.length - 1].type);
          output.push(operators.pop());
        }
        
        if (token.type === '.') {
          operators.push({ type: '.', value: '.' });
        } else {
          operators.push(token);
        }
        console.log('  operators after:', operators.map(o => o.type));
      }
    }
    
    console.log('toPostfix END,operators left:', operators.map(o => o.type));
    
    while (operators.length > 0) {
      output.push(operators.pop());
    }
    
    console.log('toPostfix final output:', output.map(o => o.type + ':' + o.value).join(', '));
    return output;
  }
  
  evaluatePostfix(postfix) {
    const stack = [];
    
    for (const token of postfix) {
      if (token.type === 'symbol') {
        stack.push(this.createBasicNFA(token.value));
      } else if (token.type === 'epsilon') {
        stack.push(this.createEpsilonNFA());
      } else if (token.type === '|') {
        if (stack.length < 2) {
          console.log('Union: stack has only', stack.length, 'elements');
          continue;
        }
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) continue;
        stack.push(this.union(a, b));
      } else if (token.type === '.') {
        if (stack.length < 2) {
          console.log('Concat: stack has only', stack.length, 'elements');
          continue;
        }
        const b = stack.pop();
        const a = stack.pop();
        if (!a || !b) continue;
        stack.push(this.concat(a, b));
      } else if (token.type === 'star' || token.type === '*') {
        const a = stack.pop();
        stack.push(this.star(a));
      } else if (token.type === 'plus' || token.type === '+') {
        const a = stack.pop();
        stack.push(this.plus(a));
      } else if (token.type === 'question' || token.type === '?') {
        const a = stack.pop();
        stack.push(this.question(a));
      }
    }
    
    return stack[0] || this.createBasicNFA('a');
  }
  
  createBasicNFA(symbol) {
    if (!this.alphabet.includes(symbol) && symbol !== 'ε') {
      this.alphabet.push(symbol);
    }
    
    const start = this.newState();
    const accept = this.newState();
    
    this.transitions[start][symbol] = [accept];
    
    return { start, accept };
  }
  
  createEpsilonNFA() {
    const start = this.newState();
    const accept = this.newState();
    
    this.transitions[start]['ε'] = [accept];
    
    return { start, accept };
  }
  
  union(a, b) {
    const start = this.newState();
    const accept = this.newState();
    
    this.transitions[start]['ε'] = [a.start, b.start];
    this.transitions[a.accept]['ε'] = [accept];
    this.transitions[b.accept]['ε'] = [accept];
    
    return { start, accept };
  }
  
  concat(a, b) {
    this.transitions[a.accept]['ε'] = [b.start];
    return { start: a.start, accept: b.accept };
  }
  
  star(a) {
    const start = this.newState();
    const accept = this.newState();
    
    this.transitions[start]['ε'] = [a.start, accept];
    this.transitions[a.accept]['ε'] = [a.start, accept];
    
    return { start, accept };
  }
  
  plus(a) {
    const start = this.newState();
    const accept = this.newState();
    
    this.transitions[start]['ε'] = [a.start];
    this.transitions[a.accept]['ε'] = [a.start, accept];
    
    return { start, accept };
  }
  
  question(a) {
    const start = this.newState();
    const accept = this.newState();
    
    this.transitions[start]['ε'] = [a.start, accept];
    this.transitions[a.accept]['ε'] = [accept];
    
    return { start, accept };
  }
}

export function regexToNFA(regex) {
  try {
    const builder = new ThompsonBuilder();
    const result = builder.build(regex);
    if (!result || !result.states || result.states.length === 0) {
      throw new Error('Failed to build NFA: no states generated');
    }
    return result;
  } catch (err) {
    console.error('regexToNFA error:', err);
    throw err;
  }
}

export function faToRegex(fa) {
  if (!fa.states || fa.states.length === 0) {
    return '';
  }
  
  if (fa.states.length === 1) {
    if (fa.accept.includes(fa.start)) {
      return 'ε';
    }
    return '∅';
  }
  
  const states = [...fa.states];
  
  const getTransition = (from, to, symbol) => {
    const transitions = fa.transitions[from];
    if (!transitions) return null;
    
    if (fa.type === 'DFA') {
      return transitions[symbol] === to ? symbol : null;
    } else {
      const symbolTrans = transitions[symbol] || [];
      return symbolTrans.includes(to) ? symbol : null;
    }
  };
  
  const stateIndex = {};
  states.forEach((s, i) => stateIndex[s] = i);
  
  const n = states.length;
  const R = Array(n).fill(null).map(() => Array(n).fill(null).map(() => new Set()));
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        R[i][j].add('ε');
      }
    }
  }
  
  for (const fromState of states) {
    const trans = fa.transitions[fromState];
    if (!trans) continue;
    
    for (const [symbol, nextStates] of Object.entries(trans)) {
      const targets = Array.isArray(nextStates) ? nextStates : [nextStates];
      for (const toState of targets) {
        const fromIdx = stateIndex[fromState];
        const toIdx = stateIndex[toState];
        R[fromIdx][toIdx].add(symbol);
      }
    }
  }
  
  const eliminate = (k) => {
    for (let i = 0; i < n; i++) {
      if (i === k) continue;
      for (let j = 0; j < n; j++) {
        if (j === k) continue;
        
        const Rik = Array.from(R[i][k]);
        const Rkj = Array.from(R[k][j]);
        const Rkk = Array.from(R[k][k]);
        
        for (const a of Rik) {
          for (const b of Rkj) {
            let combined;
            if (a === 'ε') {
              combined = b;
            } else if (b === 'ε') {
              combined = a;
            } else {
              combined = a + b;
            }
            
            for (const star of Rkk) {
              let loopCombined;
              if (star === 'ε') {
                loopCombined = 'ε';
              } else {
                loopCombined = star + '*';
              }
              
              const final = combined;
              
              if (final === 'ε') {
                R[i][j].add(loopCombined);
              } else {
                R[i][j].add(final);
              }
            }
          }
        }
      }
    }
  };
  
  for (let k = 0; k < n; k++) {
    eliminate(k);
  }
  
  const startIdx = stateIndex[fa.start];
  
  for (const acceptState of fa.accept) {
    const acceptIdx = stateIndex[acceptState];
    
    let regex = '';
    const fromStates = R[startIdx][acceptIdx];
    
    if (fromStates.size === 0) {
      continue;
    }
    
    const sorted = Array.from(fromStates).sort((a, b) => b.length - a.length);
    
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0) regex += '|';
      regex += sorted[i];
    }
    
    if (regex === 'ε') {
      return 'ε';
    }
    
    return simplifyRegex(regex);
  }
  
  return '∅';
}

function simplifyRegex(regex) {
  if (regex === 'ε') return 'ε';
  
  regex = regex.replace(/ε/g, '');
  
  if (regex.includes('|')) {
    const parts = regex.split('|');
    if (parts.length === 2 && parts[0] === parts[1]) {
      return parts[0];
    }
  }
  
  return regex || '∅';
}

export function testRegex(regex, testString) {
  const nfa = regexToNFA(regex);
  
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
  
  currentStates = epsilonClosure(currentStates);
  
  for (const symbol of testString) {
    const nextStates = new Set();
    
    for (const state of currentStates) {
      const symbolTransitions = nfa.transitions[state]?.[symbol] || [];
      for (const nextState of symbolTransitions) {
        nextStates.add(nextState);
      }
    }
    
    if (nextStates.size === 0) {
      return false;
    }
    
    currentStates = epsilonClosure(nextStates);
  }
  
  return Array.from(currentStates).some(state => nfa.accept.includes(state));
}

export function testNFA(nfa, testString) {
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
  
  currentStates = epsilonClosure(currentStates);
  
  for (const symbol of testString) {
    const nextStates = new Set();
    
    for (const state of currentStates) {
      const symbolTransitions = nfa.transitions[state]?.[symbol] || [];
      for (const nextState of symbolTransitions) {
        nextStates.add(nextState);
      }
    }
    
    if (nextStates.size === 0) {
      return false;
    }
    
    currentStates = epsilonClosure(nextStates);
  }
  
  return Array.from(currentStates).some(state => nfa.accept.includes(state));
}

export function createSampleRegexNFA() {
  return regexToNFA('(a|b)*abb');
}

export function createSampleRegex() {
  return '(a|b)*abb';
}