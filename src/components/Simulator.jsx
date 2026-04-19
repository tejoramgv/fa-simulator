import { useState, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  useNodesState,
  useEdgesState,
  MarkerType,
  Handle,
  Position
} from 'reactflow';
import 'reactflow/dist/style.css';
import SelfLoopEdge from './SelfLoopEdge';
import { simulateDFA } from '../logic/dfa';
import { simulateNFA } from '../logic/nfa';

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

function Simulator({ automaton, simulatorAutomaton }) {
  const displayAutomaton = simulatorAutomaton || automaton;
  const [testString, setTestString] = useState('');
  const [result, setResult] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState('');
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const generateGraphElements = (highlightState = null) => {
    if (!displayAutomaton) return;
    
    const newNodes = [];
    const newEdges = [];
    
    const n = displayAutomaton.states.length;
    const centerX = 300;
    const centerY = 200;
    const radius = Math.min(180, 40 + n * 25);
    
    displayAutomaton.states.forEach((state, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      const isStart = state === displayAutomaton.start;
      const isAccept = displayAutomaton.accept.includes(state);
      const isCurrent = highlightState === state || 
        (highlightState && highlightState.includes && highlightState.includes(state));
      
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
    for (const [fromState, transitions] of Object.entries(displayAutomaton.transitions)) {
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
    
    for (const [fromState, transitions] of Object.entries(displayAutomaton.transitions)) {
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
          
          const isHighlighted = highlightState === fromState;
          
          newEdges.push({
            id: edgeKey,
            source: fromState,
            target: toState,
            label: label,
            animated: isHighlighted,
            style: { 
              stroke: isHighlighted ? '#f59e0b' : '#64748b', 
              strokeWidth: isHighlighted ? 3 : 2 
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: isHighlighted ? '#f59e0b' : '#64748b'
            },
            labelStyle: { 
              fill: isHighlighted ? '#f59e0b' : '#0f172a', 
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
  };

  useEffect(() => {
    generateGraphElements();
  }, [displayAutomaton]);

  const handleSimulate = () => {
    if (!displayAutomaton) {
      setError('Please generate or input an automaton first');
      return;
    }

    if (!testString.trim()) {
      setError('Please enter a test string');
      return;
    }

    setError('');
    setCurrentStep(0);

    try {
      if (displayAutomaton.type === 'DFA') {
        const simResult = simulateDFA(displayAutomaton, testString);
        setResult(simResult);
        
        if (!simResult.accepted && simResult.path.length > 0) {
          const finalState = simResult.path[simResult.path.length - 1].state;
          generateGraphElements(finalState);
        }
      } else {
        const simResult = simulateNFA(displayAutomaton, testString);
        setResult(simResult);
        
        if (simResult.currentStates && simResult.currentStates.length > 0) {
          generateGraphElements(simResult.currentStates);
        }
      }
    } catch (err) {
      setError('Simulation failed: ' + err.message);
    }
  };

  const handleStep = () => {
    if (!result || !result.path) return;
    
    if (currentStep < result.path.length) {
      const step = result.path[currentStep];
      
      if (displayAutomaton.type === 'DFA') {
        generateGraphElements(step.state);
      } else {
        generateGraphElements(step.states);
      }
      
      setCurrentStep(currentStep + 1);
    }
  };

  const handleReset = () => {
    setTestString('');
    setResult(null);
    setCurrentStep(0);
    setError('');
    generateGraphElements();
  };

  const runAllSteps = async () => {
    if (!result || !result.path) return;
    
    for (let i = 0; i < result.path.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const step = result.path[i];
      
      if (automaton.type === 'DFA') {
        generateGraphElements(step.state);
      } else {
        generateGraphElements(step.states);
      }
      
      setCurrentStep(i + 1);
    }
  };

  return (
    <div className="simulator">
      <style>{nodeStyles}</style>
      
      <section className="section">
        <h2 className="section-title">Test FA</h2>
        
        {!displayAutomaton ? (
          <p className="input-hint">Generate or input an automaton first using the Generator or Regex tab.</p>
        ) : (
          <>
            <div className="input-group">
              <label htmlFor="testString">Test String</label>
              <input
                id="testString"
                type="text"
                value={testString}
                onChange={(e) => setTestString(e.target.value)}
                placeholder="Enter a string to test (e.g., 01, 101, 001)"
              />
              <p className="input-hint">
                Enter a string over the alphabet: {displayAutomaton.alphabet.join(', ')}
              </p>
            </div>

            {error && <p className="error-message">{error}</p>}

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSimulate}>
                Run
              </button>
              <button className="btn btn-secondary" onClick={handleStep} disabled={!result || currentStep >= (result.path?.length || 0)}>
                Step
              </button>
              <button className="btn btn-secondary" onClick={runAllSteps} disabled={!result}>
                Animate
              </button>
              <button className="btn btn-secondary" onClick={handleReset}>
                Reset
              </button>
            </div>

            {result && (
              <>
                <div className="card">
                  <h3 className="card-title">Simulation Path</h3>
                  {result.path?.map((step, i) => (
                    <div key={i} className="step-display">
                      <span className="step-number">{step.step}.</span>
                      {displayAutomaton.type === 'DFA' ? (
                        <span>State: <strong>{step.state}</strong> {step.symbol && `→ "${step.symbol}"`}</span>
                      ) : (
                        <span>States: <strong>{`{${step.states.join(',')}}`}</strong> {step.symbol && `→ "${step.symbol}"`}</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className={`result ${result.accepted ? 'result-accepted' : 'result-rejected'}`}>
                  {result.accepted ? 'ACCEPTED' : 'REJECTED'}
                  {result.currentState && displayAutomaton.type === 'DFA' && <span> (final state: {result.currentState})</span>}
                  {result.currentStates && displayAutomaton.type !== 'DFA' && <span> (final states: {`{${result.currentStates.join(',')}}`})</span>}
                </div>

                {result.error && <p className="error-message">{result.error}</p>}
              </>
            )}

            <div className="card">
              <h3 className="card-title">Visual Simulation</h3>
              <div className="automaton-display" style={{ height: '450px' }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                zoomOnScroll={false}
                zoomOnPinch={false}
                panOnScroll={false}
                panOnDrag={false}
                elementsSelectable={false}
                nodesDraggable={false}
                nodesConnectable={false}
                proOptions={{ hideAttribution: true }}
                attributionPosition="bottom-left"
              >
                  <Background color="#e2e8f0" gap={20} />
                </ReactFlow>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default Simulator;