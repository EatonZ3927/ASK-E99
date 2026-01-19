
import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex flex-col items-center mb-8 animate-fade-in">
      <div className="bg-red-50 p-6 rounded-3xl mb-4 shadow-sm">
        <div className="w-12 h-12 flex items-center justify-center text-red-600">
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M21,6H3C1.9,6,1,6.9,1,8v8c0,1.1,0.9,2,2,2h18c1.1,0,2-0.9,2-2V8C23,6.9,22.1,6,21,6z M7,13H5v2H4v-2H2v-1h2V10h1v2h2V13z M10.5,15c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S11.3,15,10.5,15z M10.5,11c-0.8,0-1.5-0.7-1.5-1.5 s0.7-1.5,1.5-1.5S12,8.7,12,9.5S11.3,11,10.5,11z M15.5,15c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S16.3,15,15.5,15z M18.5,13c-0.8,0-1.5-0.7-1.5-1.5s0.7-1.5,1.5-1.5s1.5,0.7,1.5,1.5S19.3,13,18.5,13z" />
            </svg>
        </div>
      </div>
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        ASK <span className="text-red-600 relative">
          E99
          <span className="absolute bottom-1 left-0 w-full h-1 bg-red-600 rounded-full transform translate-y-2"></span>
        </span>
      </h1>
    </div>
  );
};

export default Logo;
