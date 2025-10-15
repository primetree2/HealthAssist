import React, { useEffect, useState } from 'react';
import apiClient from '../api';

export default function History({ refreshFlag }) {
  const [items, setItems] = useState([]);

  const fetchHistory = () => {
    const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';
    
    apiClient.get('/api/history')
      .then(r => setItems(r.data))
      .catch((error) => {
        
        console.error("Failed to fetch history:", error);
      });
  };


  useEffect(() => { fetchHistory() }, []);
  useEffect(() => { fetchHistory() }, [refreshFlag]);

  return (
    <div>
      <h3 className="font-semibold text-white mb-3 text-lg flex items-center gap-2">
        <span>🕒</span> Recent Analyses
      </h3>
      <div className="max-h-44 overflow-y-auto space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-gray-400 italic">No history yet</div>
        ) : (
          items.map(it => (
            <div key={it.id} className="p-3 border border-gray-700 rounded-xl bg-gray-900/50 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-xs text-white">{new Date(it.timestamp).toLocaleString()}</div>
              <div className="text-sm text-white font-medium mt-1">{it.symptoms}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}