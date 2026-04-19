import { useState } from 'react';
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
import { minimizeDFA, compareDFAs, createSampleMinimizableDFA, createEvenOddMinimizableDFA } from '../logic/minimization';

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

function Minimizer({ automaton, onAutomatonChange }) {
  const [minimizedDFA, setMinimizedDFA] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [steps, setSteps] = useState([]);
  const [showSteps, setShowSteps] = useState(false);
  const [error, setError] = useState('');
  
  const [nodesOriginal, setNodesOriginal, onNodesOriginalChange] = useNodesState([]);
  const [edgesOriginal, setEdgesOriginal, onEdgesOriginalChange] = useEdgesState([]);
  const [nodesMinimized, setNodesMinimized, onNodesMinimizedChange] = useNodesState([]);
  const [edgesMinimized, setEdgesMinimized, onEdgesMinimizedChange] = useEdgesState([]);

  const generateGraphElements = (dfa, setNodes, setEdges) => {
    if (!dfa) return;
    
    const newNodes = [];
    const newEdges = [];
    
    const n = dfa.states.length;
    const centerX = 200;
    const centerY = 150;
    const radius = Math.min(150, 30 + n * 20);
    
    dfa.states.forEach((state, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const isStart = state === dfa.start;
      const isAccept = dfa.accept.includes(state);
      
      newNodes.push({
        id: state,
        type: 'custom',
        position: { x, y },
        data: { label: state, isStart, isAccept }
      });
    });
    
    for (const [fromState, transitions] of Object.entries(dfa.transitions)) {
      if (!transitions) continue;
      
      for (const [symbol, toState] of Object.entries(transitions)) {
        if (!toState) continue;
        
        const edgeKey = `${fromState}-${toState}-${symbol}`;
        
        if (fromState === toState) {
          newEdges.push({
            id: edgeKey,
            source: fromState,
            target: toState,
            label: symbol,
            type: 'self',
            data: { label: symbol },
            style: { stroke: '#64748b', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
          });
        } else {
          newEdges.push({
            id: edgeKey,
            source: fromState,
            target: toState,
            label: symbol,
            data: { label: symbol },
            style: { stroke: '#64748b', strokeWidth: 2 },
            labelStyle: { 
              fill: '#0f172a', 
              fontWeight: 600,
              fontSize: 14
            },
            labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
            labelBgPadding: [4, 4],
            labelBgBorderRadius: 4,
            labelShowBg: true,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' }
          });
        }
      }
    }
    
    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleMinimize = () => {
    if (!automaton || automaton.type !== 'DFA') {
      setError('Please provide a DFA to minimize');
      return;
    }

    setError('');

    try {
      const result = minimizeDFA(automaton, showSteps);
      setMinimizedDFA(result.dfa);
      setSteps(result.steps);
      
      const comp = compareDFAs(result.original, result.dfa);
      setComparison(comp);
      
      generateGraphElements(result.original, setNodesOriginal, setEdgesOriginal);
      generateGraphElements(result.dfa, setNodesMinimized, setEdgesMinimized);
    } catch (err) {
      setError('Minimization failed: ' + err.message);
    }
  };

  const handleLoadSample = (sample) => {
    setError('');
    let sampleDFA;
    
    if (sample === 'even-odd') {
      sampleDFA = createEvenOddMinimizableDFA();
    } else {
      sampleDFA = createSampleMinimizableDFA();
    }
    
    onAutomatonChange(sampleDFA);
    generateGraphElements(sampleDFA, setNodesOriginal, setEdgesOriginal);
  };

  const handleUseMinimized = () => {
    if (minimizedDFA) {
      onAutomatonChange(minimizedDFA);
    }
  };

  return (
    <div className="minimizer">
      <style>{nodeStyles}</style>
      
      <section className="section">
        <h2 className="section-title">Minimize DFA</h2>
        
        {!automaton || automaton.type !== 'DFA' ? (
          <>
            <p className="input-hint">Load a sample DFA to test minimization:</p>
            <div className="btn-group">
              <button className="btn btn-secondary" onClick={() => handleLoadSample('basic')}>
                Load Sample 1
              </button>
              <button className="btn btn-secondary" onClick={() => handleLoadSample('even-odd')}>
                Load Even/Odd DFA
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="input-group">
              <label>
                <input
                  type="checkbox"
                  checked={showSteps}
                  onChange={(e) => setShowSteps(e.target.checked)}
                /> Show Step-by-Step
              </label>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleMinimize}>
                Minimize DFA
              </button>
            </div>
          </>
        )}
      </section>

      {comparison && (
        <section className="section">
          <h2 className="section-title">Comparison</h2>
          
          <div className="grid-2">
            <div className="comparison-panel">
              <h3 className="comparison-title">Original DFA</h3>
              <p><strong>States:</strong> {comparison.states.original}</p>
              <p><strong>Start:</strong> {comparison.startState.original}</p>
              <p><strong>Accept:</strong> {comparison.acceptStates.original.join(', ')}</p>
              <p><strong>Transitions:</strong> {comparison.transitions.original}</p>
            </div>

            <div className="comparison-panel">
              <h3 className="comparison-title">Minimized DFA</h3>
              <p><strong>States:</strong> {comparison.states.minimized}</p>
              <p><strong>Start:</strong> {comparison.startState.minimized}</p>
              <p><strong>Accept:</strong> {comparison.acceptStates.minimized.join(', ')}</p>
              <p><strong>Transitions:</strong> {comparison.transitions.minimized}</p>
            </div>
          </div>

          <div className="card" style={{ marginTop: '16px' }}>
            <h3 className="card-title">Reduction Summary</h3>
            <p>
              Reduced from <strong>{comparison.states.original}</strong> states to{' '}
              <strong>{comparison.states.minimized}</strong> states ({comparison.states.removed} removed)
            </p>
          </div>
        </section>
      )}

      {showSteps && steps.length > 0 && (
        <section className="section">
          <h2 className="section-title">Minimization Steps</h2>
          {steps.map((step, i) => (
            <div key={i} className="card">
              <h3 className="card-title">{step.title}</h3>
              <p>{step.description}</p>
              {step.partitions && (
                <div style={{ marginTop: '8px' }}>
                  {step.partitions.map((partition, j) => (
                    <span key={j} className="state-chip" style={{ margin: '4px' }}>
                      {`{${partition.join(',')}}`}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {minimizedDFA && (
        <>
          <section className="section">
            <h2 className="section-title">Original DFA</h2>
            <div className="automaton-display" style={{ height: '350px' }}>
              <ReactFlow
                nodes={nodesOriginal}
                edges={edgesOriginal}
                onNodesChange={onNodesOriginalChange}
                onEdgesChange={onEdgesOriginalChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                attributionPosition="bottom-left"
                zoomControls={false}
                minZoom={1}
                maxZoom={1}
                nodesDraggable={false}
              >
                <Background color="#e2e8f0" gap={20} />
              </ReactFlow>
            </div>
          </section>

          <section className="section">
            <h2 className="section-title">Minimized DFA</h2>
            <div className="automaton-display" style={{ height: '350px' }}>
              <ReactFlow
                nodes={nodesMinimized}
                edges={edgesMinimized}
                onNodesChange={onNodesMinimizedChange}
                onEdgesChange={onEdgesMinimizedChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                attributionPosition="bottom-left"
                zoomControls={false}
                minZoom={1}
                maxZoom={1}
                nodesDraggable={false}
              >
                <Background color="#e2e8f0" gap={20} />
              </ReactFlow>
            </div>

            <div className="btn-group" style={{ marginTop: '16px' }}>
              <button className="btn btn-primary" onClick={handleUseMinimized}>
                Use Minimized DFA
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default Minimizer;