import { useState, useEffect, useCallback } from 'react';
import { dfaToNFA } from '../logic/dfa';
import { nfaToDFA, epsilonNFAtoNFA, createNFA, createSampleENFA, createSampleNFA, createSampleDFA } from '../logic/nfa';
import ReactFlow, { 
  Background, 
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import SelfLoopEdge from './SelfLoopEdge';

const nodeStyles = `
  .custom-node {
    background: white;
    border: 2px solid #e2e8f0;
    border-radius: 50%;
    padding: 10px;
    width: 60px;
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
  }
  .custom-node.accepting {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.1);
  }
  .custom-node.start {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
  }
  .visual-legend {
    position: absolute;
    top: 10px;
    right: 10px;
    background: white;
    padding: 8px 12px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    font-size: 11px;
    z-index: 10;
    display: flex;
    gap: 12px;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .legend-circle {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid;
  }
  .legend-circle.start {
    border-color: #2563eb;
    background: rgba(37, 99, 235, 0.1);
  }
  .legend-circle.accept {
    border-color: #10b981;
    background: rgba(16, 185, 129, 0.1);
  }
`;

function CustomNode({ data }) {
  const { label, isStart, isAccept } = data;
  
  let className = 'custom-node';
  if (isAccept) className += ' accepting';
  if (isStart) className += ' start';
  
  return (
    <>
      <Handle type="target" position={Position.Left} />
      <div className={className}>
        {label}
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
}

const nodeTypes = { custom: CustomNode };
const edgeTypes = { self: SelfLoopEdge };

function generateGraphElements(automaton) {
  if (!automaton) return { nodes: [], edges: [] };
  
  const newNodes = [];
  const newEdges = [];
  
  const n = automaton.states.length;
  const centerX = 300;
  const centerY = 200;
  const radius = Math.min(200, 80 + n * 40);
  
  automaton.states.forEach((state, i) => {
    let angle;
    if (n === 1) {
      angle = -Math.PI / 2;
    } else if (n === 2) {
      angle = i === 0 ? -Math.PI / 2 : Math.PI / 2;
    } else if (n === 3) {
      angle = (2 * Math.PI * i) / 3 - Math.PI / 2;
    } else {
      angle = (2 * Math.PI * i) / n - Math.PI / 2;
    }
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    
    const isStart = state === automaton.start;
    const isAccept = automaton.accept.includes(state);
    
    newNodes.push({
      id: state,
      type: 'custom',
      position: { x, y },
      data: { 
        label: state, 
        isStart, 
        isAccept 
      }
    });
  });
  
  const combinedLabels = {};
  for (const [fromState, transitions] of Object.entries(automaton.transitions)) {
    if (!transitions) continue;
    for (const [symbol, toStates] of Object.entries(transitions)) {
      const targets = Array.isArray(toStates) ? toStates : [toStates];
      for (const toState of targets) {
        if (!toState) continue;
        const key = `${fromState}-${toState}`;
        if (!combinedLabels[key]) combinedLabels[key] = [];
        const displaySymbol = symbol === 'ε' ? 'ε' : symbol;
        if (!combinedLabels[key].includes(displaySymbol)) {
          combinedLabels[key].push(displaySymbol);
        }
      }
    }
  }
  
  const processedPairs = new Set();
  
  for (const [fromState, transitions] of Object.entries(automaton.transitions)) {
    if (!transitions) continue;
    
    for (const [symbol, toStates] of Object.entries(transitions)) {
      const targets = Array.isArray(toStates) ? toStates : [toStates];
      
      for (const toState of targets) {
        if (!toState) continue;
        
        const pairKey = `${fromState}-${toState}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        const label = combinedLabels[pairKey].join(',');
        const edgeKey = pairKey;
        
        if (fromState === toState) {
          newEdges.push({
            id: edgeKey,
            source: fromState,
            target: toState,
            label: label,
            type: 'self',
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b'
            },
          });
        } else {
          newEdges.push({
            id: edgeKey,
            source: fromState,
            target: toState,
            label: label,
            type: 'default',
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#64748b'
            },
            labelStyle: { 
              fill: '#0f172a', 
              fontWeight: 500,
              fontSize: 12,
              background: 'white',
              padding: '2px 4px'
            },
            labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
            labelBgPadding: [4, 4],
            labelBgBorderRadius: 2,
            labelShowBg: true,
          });
        }
      }
    }
  }
  
  return { nodes: newNodes, edges: newEdges };
}

function Converter({ automaton, onAutomatonChange, onSimulatorAutomatonChange }) {
  const [showSteps, setShowSteps] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [conversionType, setConversionType] = useState('nfa-to-dfa');
  const [manualInput, setManualInput] = useState('');
  const [nfaInput, setNfaInput] = useState('');
  
  const [originalNodes, setOriginalNodes, onOriginalNodesChange] = useNodesState([]);
  const [originalEdges, setOriginalEdges, onOriginalEdgesChange] = useEdgesState([]);
  const [resultNodes, setResultNodes, onResultNodesChange] = useNodesState([]);
  const [resultEdges, setResultEdges, onResultEdgesChange] = useEdgesState([]);
  
  const generateOriginalGraph = useCallback(() => {
    const { nodes, edges } = generateGraphElements(automaton);
    setOriginalNodes(nodes);
    setOriginalEdges(edges);
  }, [automaton, setOriginalNodes, setOriginalEdges]);
  
  const generateResultGraph = useCallback(() => {
    if (!result?.automaton) {
      setResultNodes([]);
      setResultEdges([]);
      return;
    }
    const { nodes, edges } = generateGraphElements(result.automaton);
    setResultNodes(nodes);
    setResultEdges(edges);
  }, [result, setResultNodes, setResultEdges]);
  
  useEffect(() => {
    generateOriginalGraph();
  }, [generateOriginalGraph]);
  
  useEffect(() => {
    generateResultGraph();
  }, [generateResultGraph]);

  const handleConversion = () => {
    setError('');
    setResult(null);

    if (!automaton) {
      setError('Please generate or input an automaton first');
      return;
    }

    try {
      if (conversionType === 'dfa-to-nfa') {
        if (automaton.type !== 'DFA') {
          setError('Current automaton is not a DFA');
          return;
        }
        const nfa = dfaToNFA(automaton);
        setResult({
          type: 'NFA',
          automaton: nfa,
          description: 'DFA → NFA (Direct conversion - each DFA state becomes an NFA state with single transition)'
        });
        onAutomatonChange(nfa);
      } else if (conversionType === 'nfa-to-dfa') {
        if (automaton.type !== 'NFA') {
          setError('Current automaton is not an NFA');
          return;
        }
        const dfa = nfaToDFA(automaton, showSteps);
        setResult({
          type: 'DFA',
          automaton: dfa,
          description: 'NFA → DFA (Subset Construction)',
          steps: dfa.steps
        });
        onSimulatorAutomatonChange(dfa);
      } else if (conversionType === 'enfa-to-nfa') {
        if (automaton.type !== 'ε-NFA') {
          setError('Current automaton is not an ε-NFA');
          return;
        }
        const nfa = epsilonNFAtoNFA(automaton, showSteps);
        setResult({
          type: 'NFA',
          automaton: nfa,
          description: 'ε-NFA → NFA (Epsilon Closure)',
          steps: nfa.steps
        });
        onAutomatonChange(nfa);
      }
    } catch (err) {
      setError('Conversion failed: ' + err.message);
    }
  };

  const handleManualInput = () => {
    try {
      setError('');
      const parsed = JSON.parse(manualInput);
      
      if (conversionType === 'enfa-to-nfa') {
        if (parsed.type !== 'ε-NFA') {
          setError('Input must be an ε-NFA');
          return;
        }
        onAutomatonChange(parsed);
      } else {
        setError('Please use the Generator or Regex tab to create automata');
      }
    } catch (err) {
      setError('Invalid JSON: ' + err.message);
    }
  };

  const handleLoadSampleENFA = () => {
    const enfa = createSampleENFA();
    onAutomatonChange(enfa);
    setConversionType('enfa-to-nfa');
  };

  const handleLoadSampleNFA = () => {
    const nfa = createSampleNFA();
    onAutomatonChange(nfa);
    setConversionType('nfa-to-dfa');
  };

  const handleLoadSampleDFA = () => {
    const dfa = createSampleDFA();
    onAutomatonChange(dfa);
    setConversionType('dfa-to-nfa');
  };

  return (
    <div className="converter">
      <section className="section">
        <h2 className="section-title">Convert Automata</h2>
        
        <div className="input-group">
          <label htmlFor="conversionType">Conversion Type</label>
          <select
            id="conversionType"
            value={conversionType}
            onChange={(e) => setConversionType(e.target.value)}
          >
            <option value="dfa-to-nfa">DFA → NFA</option>
            <option value="nfa-to-dfa">NFA → DFA (Subset Construction)</option>
            <option value="enfa-to-nfa">ε-NFA → NFA</option>
          </select>
        </div>

        <div className="input-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
            <input
              type="checkbox"
              checked={showSteps}
              onChange={(e) => setShowSteps(e.target.checked)}
            /> Show Step-by-Step
          </label>
        </div>

        {error && <p className="error-message">{error}</p>}

        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleConversion}>
            Convert
          </button>
        </div>
      </section>

      <section className="section">
        <h2 className="section-title">Load Sample Automata</h2>
        <div className="btn-group">
          <button className="btn btn-secondary" onClick={handleLoadSampleENFA}>
            Load Sample ε-NFA
          </button>
          <button className="btn btn-secondary" onClick={handleLoadSampleNFA}>
            Load Sample NFA
          </button>
          <button className="btn btn-secondary" onClick={handleLoadSampleDFA}>
            Load Sample DFA
          </button>
        </div>
      </section>

      {automaton && (
        <section className="section">
          <h2 className="section-title">Current Finite Automata</h2>
          <div className="grid-2">
            <div className="card">
              <p><strong>Type:</strong> {automaton.type}</p>
              <p><strong>States:</strong> {automaton.states.join(', ')}</p>
              <p><strong>Alphabet:</strong> {automaton.alphabet.join(', ')}</p>
            </div>
            <div className="card">
              <style>{nodeStyles}</style>
              <h3 className="card-title">Visual Representation</h3>
              <div className="automaton-display" style={{ height: '350px', position: 'relative' }}>
                <div className="visual-legend">
                  <div className="legend-item">
                    <div className="legend-circle start"></div>
                    <span>Start State</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-circle accept"></div>
                    <span>Accept State</span>
                  </div>
                </div>
                <ReactFlow
                  nodes={originalNodes}
                  edges={originalEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  panOnScroll={false}
                  panOnDrag={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#e2e8f0" gap={20} />
                </ReactFlow>
              </div>
            </div>
            
            <div className="card">
              <style>{nodeStyles}</style>
              <h3 className="card-title">After ({result?.type})</h3>
              <div className="automaton-display" style={{ height: '350px', position: 'relative' }}>
                <div className="visual-legend">
                  <div className="legend-item">
                    <div className="legend-circle start"></div>
                    <span>Start</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-circle accept"></div>
                    <span>Accept</span>
                  </div>
                </div>
                <ReactFlow
                  nodes={resultNodes}
                  edges={resultEdges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  fitView
                  fitViewOptions={{ padding: 0.2 }}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={false}
                  zoomOnScroll={false}
                  zoomOnPinch={false}
                  panOnScroll={false}
                  panOnDrag={false}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background color="#e2e8f0" gap={20} />
                </ReactFlow>
              </div>
            </div>
          </div>
        </section>
      )}

      {result && result.steps && showSteps && (
        <section className="section">
          <h2 className="section-title">Step-by-Step Conversion</h2>
          {result.steps.map((step, index) => (
            <div key={index} className="card" style={{ marginBottom: '12px' }}>
              <h3 className="card-title">Step {index + 1}</h3>
              <p><strong>Description:</strong> {step.description}</p>
              {step.states && (
                <p><strong>States:</strong> {JSON.stringify(step.states)}</p>
              )}
              {step.transitions && (
                <div style={{ marginTop: '8px' }}>
                  <strong>Transitions:</strong>
                  <table style={{ marginTop: '8px', width: '100%' }}>
                    <thead>
                      <tr>
                        <th>State</th>
                        <th>Transition</th>
                        <th>Next State(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(step.transitions).map(([state, trans]) => (
                        Object.entries(trans).map(([symbol, target]) => (
                          <tr key={`${state}-${symbol}`}>
                            <td>{state}</td>
                            <td>{symbol}</td>
                            <td>{Array.isArray(target) ? target.join(', ') : target}</td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default Converter;