'use client';

import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidViewProps {
  chart: string;
}

export function MermaidView({ chart }: MermaidViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({ startOnLoad: true });
  }, []);

  useEffect(() => {
    if (ref.current && chart) {
      mermaid.render('mermaid-chart', chart).then((result) => {
        ref.current!.innerHTML = result.svg;
      }).catch((err) => {
        console.error('Mermaid render error:', err);
        ref.current!.innerHTML = '<p class="text-red-500">Failed to render chart</p>';
      });
    }
  }, [chart]);

  return (
    <div className="w-full overflow-auto p-4 bg-white rounded-lg shadow-sm border" style={{ minHeight: '300px' }}>
       <div ref={ref} />
    </div>
  );
}

