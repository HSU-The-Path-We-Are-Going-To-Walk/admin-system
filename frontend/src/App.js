import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [emergencies, setEmergencies] = useState([]);
  const [hasNewEmergency, setHasNewEmergency] = useState(false);

  const handleNewEmergency = (emergency) => {
    setEmergencies(prev => [emergency, ...prev]);
    setHasNewEmergency(true);
    setTimeout(() => setHasNewEmergency(false), 3000);
  };

  return (
    <div className={`App ${hasNewEmergency ? 'has-emergency' : ''}`}>
      <Dashboard
        emergencies={emergencies}
        setEmergencies={setEmergencies}
        onNewEmergency={handleNewEmergency}
      />
    </div>
  );
}

export default App;