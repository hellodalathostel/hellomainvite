
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UIProvider } from './context/UIContext';
import { AuthProvider } from './context/AuthContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </AuthProvider>
  </React.StrictMode>
);

void import('./utils/registerServiceWorker').then(({ registerServiceWorker }) => {
  registerServiceWorker();
});
