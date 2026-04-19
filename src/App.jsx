import { useState, useCallback, Component } from 'react';
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
  { id: 'simulator', label: 'Simulator' },
  { id: 'minimizer', label: 'Minimizer' },
  { id: 'regex', label: 'Regex' }
];

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: error.message };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-message">
            <h2>Something went wrong</h2>
            <p>{this.state.error}</p>
            <button className="btn btn-primary" onClick={this.handleRetry}>
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SafeComponent({ component: Component, fallback, ...props }) {
  try {
    return <Component {...props} />;
  } catch (error) {
    console.error('SafeComponent error:', error);
    return fallback || (
      <div className="error-message">
        <p>Component failed to render: {error.message}</p>
      </div>
    );
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('generator');
  const [automaton, setAutomaton] = useState(null);
  const [simulatorAutomaton, setSimulatorAutomaton] = useState(null);

  const handleAutomatonChange = useCallback((newAutomaton) => {
    console.log('handleAutomatonChange called:', newAutomaton?.type);
    setAutomaton(newAutomaton);
  }, []);

  const handleSimulatorAutomatonChange = useCallback((newAutomaton) => {
    console.log('handleSimulatorAutomatonChange called:', newAutomaton?.type);
    setSimulatorAutomaton(newAutomaton);
  }, []);

  const handleTabClick = useCallback((tabId) => {
    console.log('Tab clicked:', tabId);
    setActiveTab(tabId);
  }, []);

  const renderContent = () => {
    const contentProps = {
      onAutomatonGenerated: handleAutomatonChange,
      automaton,
      onAutomatonChange: handleAutomatonChange,
      onSimulatorAutomatonChange: handleSimulatorAutomatonChange,
      simulatorAutomaton
    };

    switch (activeTab) {
      case 'generator':
        return <ErrorBoundary key="generator"><Generator {...contentProps} /></ErrorBoundary>;
      case 'converter':
        return <ErrorBoundary key="converter"><Converter {...contentProps} /></ErrorBoundary>;
      case 'display':
        return <ErrorBoundary key="display"><Display {...contentProps} /></ErrorBoundary>;
      case 'simulator':
        return <ErrorBoundary key="simulator"><Simulator {...contentProps} /></ErrorBoundary>;
      case 'minimizer':
        return <ErrorBoundary key="minimizer"><Minimizer {...contentProps} /></ErrorBoundary>;
      case 'regex':
        return <ErrorBoundary key="regex"><Regex {...contentProps} /></ErrorBoundary>;
      default:
        return <ErrorBoundary key="generator"><Generator {...contentProps} /></ErrorBoundary>;
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
            onClick={() => handleTabClick(tab.id)}
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