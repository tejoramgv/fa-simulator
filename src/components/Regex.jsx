import { useState } from 'react';
import { regexToNFA, faToRegex, testRegex, testNFA, createSampleRegexNFA, createSampleRegex } from '../logic/regex';
import { nfaToDFA } from '../logic/nfa';

function Regex({ onAutomatonGenerated }) {
  const [regexInput, setRegexInput] = useState('');
  const [generatedNFA, setGeneratedNFA] = useState(null);
  const [extractedRegex, setExtractedRegex] = useState('');
  const [testString, setTestString] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [error, setError] = useState('');
  const [displayDFA, setDisplayDFA] = useState(null);

  const handleRegexToDFA = () => {
    if (!regexInput.trim()) {
      setError('Please enter a regular expression');
      return;
    }

    try {
      setError('');
      console.log('Input regex:', regexInput);
      const nfa = regexToNFA(regexInput);
      console.log('NFA result:', JSON.stringify(nfa));
      const dfa = nfaToDFA(nfa);
      console.log('DFA result:', JSON.stringify(dfa));
      setGeneratedNFA(dfa);
      setDisplayDFA(dfa);
      onAutomatonGenerated(dfa);
    } catch (err) {
      console.error('Conversion error:', err);
      setError('Failed to convert regex to DFA: ' + err.message);
    }
  };

  const handleNFAToRegex = () => {
    if (!generatedNFA) {
      setError('Please generate an NFA first');
      return;
    }

    try {
      setError('');
      const regex = faToRegex(generatedNFA);
      setExtractedRegex(regex);
    } catch (err) {
      setError('Failed to convert NFA to regex: ' + err.message);
    }
  };

  const handleTestString = () => {
    if (!regexInput.trim()) {
      setError('Please enter a regular expression to test');
      return;
    }
    if (!testString.trim()) {
      setError('Please enter a test string');
      return;
    }

    try {
      setError('');
      const nfa = regexToNFA(regexInput);
      const accepted = testNFA(nfa, testString);
      setTestResult({ accepted, string: testString });
    } catch (err) {
      setError('Failed to test string: ' + err.message);
    }
  };

  const handleLoadSample = () => {
    setError('');
    try {
      const sampleRegex = createSampleRegex();
      const sampleNFA = regexToNFA(sampleRegex);
      const sampleDFA = nfaToDFA(sampleNFA);
      setRegexInput(sampleRegex);
      setGeneratedNFA(sampleDFA);
      onAutomatonGenerated(sampleDFA);
    } catch (err) {
      setError('Failed to load sample: ' + err.message);
    }
  };

  const exampleRegexes = [
    'a*b|01*',
    '(a|b)*abb',
    '01*10',
    'a|b',
    'a*',
    '(01)*',
    'ε',
    'a',
  ];

  const handleExampleClick = (regex) => {
    setError('');
    setRegexInput(regex);
    try {
      console.log('Clicked example regex:', regex);
      const nfa = regexToNFA(regex);
      console.log('NFA result:', nfa);
      if (!nfa || !nfa.states || nfa.states.length === 0) {
        setError('Failed to parse regex: no states generated');
        return;
      }
      const dfa = nfaToDFA(nfa);
      console.log('DFA result:', dfa);
      if (!dfa || !dfa.states || dfa.states.length === 0) {
        setError('Failed to convert NFA to DFA');
        return;
      }
      console.log('Setting generatedNFA, dfa.states =', dfa.states);
      setGeneratedNFA(dfa);
      setDisplayDFA(dfa);
      console.log('Calling onAutomatonGenerated');
      onAutomatonGenerated(dfa);
      console.log('handleExampleClick completed');
    } catch (err) {
      console.error('Example click error:', err);
      setError('Failed to convert example: ' + err.message);
    }
  };

  return (
    <div className="regex">
      <section className="section">
        <h2 className="section-title">Regular Expression → NFA</h2>
        
        <div className="grid-2">
          <div className="input-group">
            <label htmlFor="regexInput">Regular Expression</label>
            <input
              id="regexInput"
              type="text"
              value={regexInput}
              onChange={(e) => setRegexInput(e.target.value)}
              placeholder="e.g., a*b|01*"
            />
            <p className="input-hint">
              Supported: | (union), * (Kleene star), + (one or more), ? (zero or one), concatenation
            </p>

            {error && <p className="error-message">{error}</p>}

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleRegexToDFA}>
                Convert RE → DFA
              </button>
            </div>
          </div>

          <div className="examples-box">
            <h3 className="card-title">Example Expressions</h3>
            <p className="input-hint">Click to generate DFA</p>
            <div className="example-list">
              {exampleRegexes.map((regex, idx) => (
                <button
                  key={idx}
                  className="example-chip"
                  onClick={() => handleExampleClick(regex)}
                >
                  {regex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {displayDFA && (
        <section className="section">
          <h2 className="section-title">Generated DFA</h2>
          
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title">States (Q)</h3>
              <div className="flex-row">
                {displayDFA.states.map((state) => (
                  <span
                    key={state}
                    className={`state-chip ${state === displayDFA.start ? 'start' : ''} ${displayDFA.accept.includes(state) ? 'accept' : ''}`}
                  >
                    {state}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Alphabet (Σ)</h3>
              <div className="flex-row">
                {displayDFA.alphabet.map((symbol) => (
                  <span key={symbol} className="badge">{symbol}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Transition Function (δ)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>State</th>
                    {displayDFA.alphabet.map((sym) => (
                      <th key={sym}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayDFA.states.map((state) => (
                    <tr key={state}>
                      <td>
                        {state === displayDFA.start && '(→) '}
                        {displayDFA.accept.includes(state) && '(*) '}
                        {state}
                      </td>
                      {displayDFA.alphabet.map((sym) => {
                        const next = displayDFA.transitions[state]?.[sym];
                        const display = next && next.length > 0 
                          ? `{${next.join(',')}}` 
                          : '∅';
                        return <td key={sym}>{display}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Test String</h2>
        
        <div className="input-group">
          <label htmlFor="testString">Test String</label>
          <input
            id="testString"
            type="text"
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter a string to test"
          />
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleTestString}>
            Test String
          </button>
        </div>

        {testResult && (
          <div className={`result ${testResult.accepted ? 'result-accepted' : 'result-rejected'}`}>
            {testResult.accepted ? 'Accepted' : 'Rejected'}: "{testResult.string}"
          </div>
        )}
      </section>
    </div>
  );
}

export default Regex;