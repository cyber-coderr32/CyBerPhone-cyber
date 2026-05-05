import React from 'react';
const OfflinePage: React.FC<any> = ({ onRetry, onContinueOffline }) => (
  <div className="p-10 text-center">
    Offline Page Stub
    <button onClick={onRetry}>Retry</button>
    <button onClick={onContinueOffline}>Continue Offline</button>
  </div>
);
export default OfflinePage;
