import { useState, useEffect, useCallback } from 'react';
import { generateDFAFromPattern, createDFA } from '../logic/dfa';
import ReactFlow, { 
  Background, 
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position,
  useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';
import SelfLoopEdge from './SelfLoopEdge';
import 'reactflow/dist/style.css';

const examplePatterns = [
  'even number of 0s',
  'odd number of 0s',
  'any string',
  'empty string'
];

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

function FlowWithFit({ nodes, edges }) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 300 });
      }, 50);
    }
  }, [nodes, edges, fitView]);

  return null;
}

function Generator({ onAutomatonGenerated }) {
  const [pattern, setPattern] = useState('');
  const [generatedDFA, setGeneratedDFA] = useState(null);
  const [error, setError] = useState('');
  
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  const generateGraphElements = useCallback(() => {
    if (!generatedDFA) return;
    
    const newNodes = [];
    const newEdges = [];
    
    const n = generatedDFA.states.length;
    const centerX = 300;
    const centerY = 200;
    const radius = Math.min(200, 80 + n * 40);
    
    generatedDFA.states.forEach((state, i) => {
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
      
      const isStart = state === generatedDFA.start;
      const isAccept = generatedDFA.accept.includes(state);
      
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
    for (const [fromState, transitions] of Object.entries(generatedDFA.transitions)) {
      if (!transitions) continue;
      for (const [symbol, toState] of Object.entries(transitions)) {
        if (!toState) continue;
        const key = `${fromState}-${toState}`;
        if (!combinedLabels[key]) combinedLabels[key] = [];
        if (!combinedLabels[key].includes(symbol)) {
          combinedLabels[key].push(symbol);
        }
      }
    }
    
    const processedPairs = new Set();
    
    for (const [fromState, transitions] of Object.entries(generatedDFA.transitions)) {
      if (!transitions) continue;
      
      for (const [symbol, toState] of Object.entries(transitions)) {
        if (!toState) continue;
        
        const pairKey = `${fromState}-${toState}`;
        if (processedPairs.has(pairKey)) continue;
        processedPairs.add(pairKey);
        
        const label = combinedLabels[pairKey].join(',');
        const edgeKey = `${fromState}-${toState}`;
        
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
    
    setNodes(newNodes);
    setEdges(newEdges);
  }, [generatedDFA, setNodes, setEdges]);

  useEffect(() => {
    generateGraphElements();
  }, [generateGraphElements]);

  const handleGenerate = () => {
    if (!pattern.trim()) {
      setError('Please enter a pattern description');
      return;
    }

    try {
      setError('');
      const dfa = generateDFAFromPattern(pattern);
      setGeneratedDFA(dfa);
      onAutomatonGenerated(dfa);
    } catch (err) {
      setError('Failed to generate automaton: ' + err.message);
    }
  };

  const handleExample = (example) => {
    setPattern(example);
    setError('');
  };

  const handleReset = () => {
    setPattern('');
    setGeneratedDFA(null);
    setError('');
    onAutomatonGenerated(null);
  };

  return (
    <div className="generator">
      <div className="grid-2" style={{ gap: '2rem' }}>
        <section className="section">
          <h2 className="section-title">Generate DFA from Description</h2>
          
          <div className="input-group">
            <label htmlFor="pattern">Pattern Description</label>
            <input
              id="pattern"
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="e.g., strings ending with 01"
            />
            <p className="input-hint">
              Describe the language in plain English (e.g., "strings ending with 01", "even number of 0s") or select any from the beside given examples
            </p>
          </div>

          {error && <p className="error-message">{error}</p>}

          <div className="btn-group">
            <button className="btn btn-primary" onClick={handleGenerate}>
              Generate DFA
            </button>
            <button className="btn btn-secondary" onClick={handleReset}>
              Reset
            </button>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Example Patterns</h2>
          <div className="flex-row" style={{ flexWrap: 'wrap' }}>
            {examplePatterns.map((example) => (
              <button
                key={example}
                className="btn btn-secondary"
                onClick={() => handleExample(example)}
                style={{ margin: '4px' }}
              >
                {example}
              </button>
            ))}
          </div>
        </section>
      </div>

      {generatedDFA && (
        <section className="section">
          <h2 className="section-title">Generated DFA</h2>
          
          <div className="grid-2">
            <div className="card">
              <h3 className="card-title">States (Q)</h3>
              <div className="flex-row">
                {generatedDFA.states.map((state) => (
                  <span
                    key={state}
                    className={`state-chip ${state === generatedDFA.start ? 'start' : ''} ${generatedDFA.accept.includes(state) ? 'accept' : ''}`}
                  >
                    {state}
                  </span>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="card-title">Alphabet (Σ)</h3>
              <div className="flex-row">
                {generatedDFA.alphabet.map((symbol) => (
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
                    {generatedDFA.alphabet.map((sym) => (
                      <th key={sym}>{sym}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {generatedDFA.states.map((state) => (
                    <tr key={state}>
                      <td>
                        {state === generatedDFA.start && '(→) '}
                        {generatedDFA.accept.includes(state) && '(*) '}
                        {state}
                      </td>
                      {generatedDFA.alphabet.map((sym) => (
                        <td key={sym}>
                          {generatedDFA.transitions[state]?.[sym] || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title">Start & Accept States</h3>
            <p><strong>Start state (q0):</strong> {generatedDFA.start}</p>
            <p><strong>Accept states (F):</strong> {generatedDFA.accept.join(', ')}</p>
          </div>

          <div className="card">
            <style>{nodeStyles}</style>
            <h3 className="card-title">Visual Representation</h3>
            <div className="automaton-display" style={{ height: '450px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
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
                <FlowWithFit nodes={nodes} edges={edges} />
              </ReactFlow>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

export default Generator;