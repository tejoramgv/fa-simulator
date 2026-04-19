import { useState, useEffect, useCallback } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import SelfLoopEdge from './SelfLoopEdge';
import { getTransitionTable } from '../logic/dfa';
import { getNFATransitionTable } from '../logic/nfa';
import { exportToJSON, importFromJSON, downloadJSON, copyToClipboard } from '../utils/helpers';

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
  .custom-node.current {
    border-color: #f59e0b;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.3);
  }
`;

function CustomNode({ data }) {
  const { label, isStart, isAccept, isCurrent } = data;
  
  let className = 'custom-node';
  if (isAccept) className += ' accepting';
  if (isStart) className += ' start';
  if (isCurrent) className += ' current';
  
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

function Display({ automaton, onAutomatonChange }) {
  const [jsonInput, setJsonInput] = useState('');
  const [error, setError] = useState('');
  const [currentState, setCurrentState] = useState(null);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const generateGraphElements = useCallback(() => {
    if (!automaton) return;
    
    const newNodes = [];
    const newEdges = [];
    const statePositions = {};
    
    const n = automaton.states.length;
    const centerX = 300;
    const centerY = 200;
    const radius = Math.min(180, 40 + n * 25);
    
    automaton.states.forEach((state, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      statePositions[state] = { x, y };
      
      const isStart = state === automaton.start;
      const isAccept = automaton.accept.includes(state);
      const isCurrent = state === currentState;
      
      newNodes.push({
        id: state,
        type: 'custom',
        position: { x, y },
        data: { 
          label: state, 
          isStart, 
          isAccept, 
          isCurrent 
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
          if (!combinedLabels[key].includes(symbol)) {
            combinedLabels[key].push(symbol);
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
          
          const isSelfLoop = fromState === toState;
          
          newEdges.push({
            id: edgeKey,
            source: fromState,
            target: toState,
            label: label,
            type: 'default',
            animated: currentState === fromState,
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
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [automaton, currentState, setNodes, setEdges]);

  useEffect(() => {
    generateGraphElements();
  }, [generateGraphElements]);

  const handleLoadJSON = () => {
    setError('');
    const result = importFromJSON(jsonInput);
    
    if (!result.success) {
      setError(result.error);
      return;
    }
    
    onAutomatonChange(result.automaton);
    setJsonInput('');
  };

  const handleExport = () => {
    if (!automaton) return;
    const json = exportToJSON(automaton);
    copyToClipboard(json);
  };

  const handleDownload = () => {
    if (!automaton) return;
    downloadJSON(automaton, 'automaton.json');
  };

  const transitionTable = automaton 
    ? (automaton.type === 'DFA' 
        ? getTransitionTable(automaton) 
        : getNFATransitionTable(automaton))
    : null;

  return (
    <div className="display">
      <style>{nodeStyles}</style>
      
      <section className="section">
        <h2 className="section-title">Display Automaton</h2>
        
        {!automaton ? (
          <p className="input-hint">Generate or input an automaton first using the Generator or Regex tab.</p>
        ) : (
          <>
            <div className="grid-2">
              <div className="card">
                <h3 className="card-title">States (Q)</h3>
                <div className="flex-row">
                  {automaton.states.map((state) => (
                    <span
                      key={state}
                      className={`state-chip ${state === automaton.start ? 'start' : ''} ${automaton.accept.includes(state) ? 'accept' : ''}`}
                    >
                      {state}
                    </span>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">Alphabet (Σ)</h3>
                <div className="flex-row">
                  {automaton.alphabet.map((symbol) => (
                    <span key={symbol} className="badge">{symbol}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Transition Table</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>State</th>
                      {transitionTable?.symbols.map((sym) => (
                        <th key={sym}>{sym}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transitionTable?.table.map((row) => (
                      <tr key={row.state}>
                        <td>
                          {row.isStart && '(→) '}
                          {row.isAccept && '(*) '}
                          {row.state}
                        </td>
                        {transitionTable.symbols.map((sym) => (
                          <td key={sym}>{row[sym]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Visual Representation</h3>
              <div className="automaton-display" style={{ height: '450px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                  attributionPosition="bottom-left"
                >
                  <Background color="#e2e8f0" gap={20} />
                  <Controls />
                  <MiniMap 
                    nodeColor={(node) => {
                      if (node.data?.isAccept) return '#10b981';
                      if (node.data?.isStart) return '#2563eb';
                      return '#e2e8f0';
                    }}
                  />
                </ReactFlow>
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Export / Import</h3>
              <div className="btn-group">
                <button className="btn btn-secondary" onClick={handleExport}>
                  Copy JSON
                </button>
                <button className="btn btn-secondary" onClick={handleDownload}>
                  Download JSON
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="section">
        <h2 className="section-title">Import Automaton</h2>
        <div className="input-group">
          <label htmlFor="jsonInput">JSON Input</label>
          <textarea
            id="jsonInput"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"type": "DFA", "states": ["q0", "q1"], "alphabet": ["0", "1"], "transitions": {"q0": {"0": "q1", "1": "q0"}, ...}, "start": "q0", "accept": ["q1"]}'
          />
        </div>
        
        {error && <p className="error-message">{error}</p>}
        
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleLoadJSON}>
            Load Automaton
          </button>
        </div>
      </section>
    </div>
  );
}

export default Display;