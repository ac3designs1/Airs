import React from 'react';

interface PlaceholderProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  color?: string;
}

export default function Placeholder({ icon: Icon, title, description, color = 'blue' }: PlaceholderProps) {
  return (
    <div className="space-y-6">
      <div className="backdrop-blur-xl rounded-2xl border border-gray-800/50 p-6"
        style={{ background: 'linear-gradient(to right,rgba(59,130,246,0.1),rgba(99,102,241,0.05),rgba(168,85,247,0.1))' }}>
        <div className="flex items-center space-x-4">
          <div className={`p-3 bg-${color}-500/20 rounded-xl border border-${color}-400/30`}>
            <Icon className={`w-7 h-7 text-${color}-400`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {description && <p className="text-gray-400 text-sm mt-0.5">{description}</p>}
          </div>
        </div>
      </div>
      <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl border border-gray-800/50 p-12 text-center">
        <Icon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
        <h2 className="text-xl font-semibold text-gray-400 mb-2">{title}</h2>
        <p className="text-gray-500 text-sm">This section is coming soon.</p>
      </div>
    </div>
  );
}
