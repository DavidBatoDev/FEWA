"use client";

import React from "react";

interface DataPoint {
  label: string;
  value: number;
}

interface ChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  type?: "bar" | "line" | "area";
}

export function MiniAreaChart({ data, color = "#22d3ee" }: { data: number[], color?: string }) {
  const max = Math.max(...data, 1);
  const height = 40;
  const width = 120;
  const step = width / (data.length - 1);
  
  const points = data.map((d, i) => `${i * step},${height - (d / max) * height}`).join(" ");
  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <polygon
        fill={`url(#gradient-${color})`}
        points={areaPoints}
      />
    </svg>
  );
}

export function BarChart({ data, title, color = "cyan" }: ChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 120;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">{title}</h4>
      </div>
      <div className="flex items-end justify-between gap-2 h-[120px] pt-2">
        {data.map((d, i) => {
          const height = (d.value / max) * chartHeight;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="relative w-full flex flex-col items-center">
                {/* Tooltip on hover */}
                <div className="absolute -top-8 bg-zinc-800 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-white/10">
                  {d.value} units
                </div>
                <div 
                  className={`w-full rounded-t-lg transition-all duration-500 ease-out shadow-lg ${
                    color === "cyan" ? "bg-cyan-500/40 group-hover:bg-cyan-400" : "bg-purple-500/40 group-hover:bg-purple-400"
                  }`}
                  style={{ height: `${height}px` }}
                />
              </div>
              <span className="text-[8px] font-bold text-zinc-600 group-hover:text-zinc-400 transition-colors uppercase tracking-tighter">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function LineChart({ data, title, color = "cyan" }: ChartProps) {
  const max = Math.max(...data.map(d => d.value), 1);
  const chartHeight = 120;
  const chartWidth = 300;
  const padding = 20;
  
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * (chartWidth - padding * 2) + padding;
    const y = chartHeight - (d.value / max) * (chartHeight - padding * 2) - padding;
    return { x, y };
  });

  const pathData = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;
  const areaData = `${pathData} L ${points[points.length - 1].x},${chartHeight} L ${points[0].x},${chartHeight} Z`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">{title}</h4>
      </div>
      <div className="relative h-[120px] w-full">
        <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none" className="overflow-visible">
          <defs>
            <linearGradient id={`line-grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color === "cyan" ? "#22d3ee" : "#a855f7"} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color === "cyan" ? "#22d3ee" : "#a855f7"} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={chartWidth-padding} y2={padding} stroke="white" strokeOpacity="0.03" strokeDasharray="4" />
          <line x1={padding} y1={chartHeight/2} x2={chartWidth-padding} y2={chartHeight/2} stroke="white" strokeOpacity="0.03" strokeDasharray="4" />
          <line x1={padding} y1={chartHeight-padding} x2={chartWidth-padding} y2={chartHeight-padding} stroke="white" strokeOpacity="0.03" strokeDasharray="4" />

          <path
            d={areaData}
            fill={`url(#line-grad-${color})`}
          />
          <path
            d={pathData}
            fill="none"
            stroke={color === "cyan" ? "#22d3ee" : "#a855f7"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {points.map((p, i) => (
            <g key={i} className="group/dot">
              <circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill={color === "cyan" ? "#22d3ee" : "#a855f7"}
                className="opacity-0 group-hover/dot:opacity-100 transition-opacity"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#09090b"
                stroke={color === "cyan" ? "#22d3ee" : "#a855f7"}
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>
        <div className="flex justify-between mt-2 px-1">
          {data.map((d, i) => (
            <span key={i} className="text-[7px] font-black text-zinc-600 uppercase tracking-tighter">
              {d.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DonutChart({ data, title, color = "purple" }: ChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const radius = 40;
  const strokeWidth = 12;
  const center = 50;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">{title}</h4>
      </div>
      <div className="flex items-center gap-8 h-[120px]">
        <div className="relative w-24 h-24">
          <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90">
            {data.map((d, i) => {
              const percentage = (d.value / total) * 100;
              const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
              
              // Calculate offset by summing previous percentages
              const previousSum = data.slice(0, i).reduce((acc, item) => acc + item.value, 0);
              const strokeDashoffset = -((previousSum / total) * circumference);
              
              const colors = color === "purple" 
                ? ["#a855f7", "#c084fc", "#e879f9", "#3b0764"]
                : ["#06b6d4", "#22d3ee", "#67e8f9", "#083344"];

              return (
                <circle
                  key={i}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={colors[i % colors.length]}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-1000 ease-out"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs font-black text-white">{total}</span>
            <span className="text-[7px] text-zinc-500 font-bold uppercase">Total</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 flex-1">
          {data.map((d, i) => {
            const colors = color === "purple" 
              ? ["bg-purple-500", "bg-purple-400", "bg-pink-400", "bg-indigo-900"]
              : ["bg-cyan-500", "bg-cyan-400", "bg-blue-300", "bg-zinc-800"];
            
            return (
              <div key={i} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${colors[i % colors.length]}`} />
                  <span className="text-[9px] font-bold text-zinc-400 truncate max-w-[80px]">{d.label}</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-white">{Math.round((d.value/total)*100)}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
