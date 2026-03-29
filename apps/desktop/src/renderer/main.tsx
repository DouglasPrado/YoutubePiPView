import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { QueueApp } from './components/QueueApp';

const isQueueWindow = window.location.hash === '#/queue';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isQueueWindow ? <QueueApp /> : <App />}
  </React.StrictMode>
);
