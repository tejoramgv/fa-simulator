import { useState, useCallback } from 'react';
import Generator from './components/Generator';
import Converter from './components/Converter';
import Display from './components/Display';
import Regex from './components/Regex';
import Simulator from './components/Simulator';
import Minimizer from './components/Minimizer';

const tabs = [
  { id: 'generator', label: 'Generator' },
  { id: 'converter', label: 'Converter' },
  { id: 'display', label: 'Display' },
  { id: 'regex', label: 'Regex' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'minimizer', label: 'Minimizer' }
];

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [automaton, setAutomaton] = useState(null);
  const [simulatorAutomaton, setSimulatorAutomaton] = useState(null);

  const handleAutomatonChange = useCallback((newAutomaton) => {
    setAutomaton(newAutomaton);
  }, []);

  const handleSimulatorAutomatonChange = useCallback((newAutomaton) => {
    setSimulatorAutomaton(newAutomaton);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'generator':
        return <Generator onAutomatonGenerated={handleAutomatonChange} />;
      case 'converter':
        return <Converter automaton={automaton} onAutomatonChange={handleAutomatonChange} onSimulatorAutomatonChange={handleSimulatorAutomatonChange} />;
      case 'display':
        return <Display automaton={automaton} onAutomatonChange={handleAutomatonChange} />;
      case 'regex':
        return <Regex onAutomatonGenerated={handleAutomatonChange} />;
      case 'simulator':
        return <Simulator automaton={automaton} simulatorAutomaton={simulatorAutomaton} />;
      case 'minimizer':
        return <Minimizer automaton={automaton} onAutomatonChange={handleAutomatonChange} />;
      default:
        return <Generator onAutomatonGenerated={handleAutomatonChange} />;
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Finite Automata Simulator</h1>
        <p>Create, convert, visualize, and test finite automata</p>
      </header>

      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;