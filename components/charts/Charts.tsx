import React from 'react';
import { formatCompactCurrency } from '../../utils/utils';
import type { RoomRevenueData } from '../../hooks/useReportAnalytics';

interface BarChartProps {
  data: RoomRevenueData[];
  title: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, height = 300 }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          Không có dữ liệu
        </div>
      </div>
    );
  }

  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const padding = 40;
  const chartWidth = Math.max(600, data.length * 80);
  const chartHeight = height;
  const barWidth = Math.min(50, (chartWidth - padding * 2) / data.length * 0.7);
  const barSpacing = (chartWidth - padding * 2) / data.length;

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="mx-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
            const value = Math.round(maxRevenue * ratio);
            return (
              <g key={`grid-${ratio}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="end"
                  className="dark:fill-gray-400"
                >
                  {formatCompactCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const x = padding + idx * barSpacing + (barSpacing - barWidth) / 2;
            const barHeight = (item.revenue / maxRevenue) * (chartHeight - padding * 2);
            const y = chartHeight - padding - barHeight;

            return (
              <g key={`bar-${idx}`}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill="#3b82f6"
                  rx="4"
                  className="hover:fill-blue-600 transition cursor-pointer"
                >
                  <title>{item.roomId}: {formatCompactCurrency(item.revenue)}</title>
                </rect>
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padding + 20}
                  fontSize="12"
                  fill="#374151"
                  textAnchor="middle"
                  className="dark:fill-gray-400"
                >
                  {item.roomId}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#d1d5db"
            className="dark:stroke-gray-600"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="#d1d5db"
            className="dark:stroke-gray-600"
          />
        </svg>
      </div>
    </div>
  );
};

interface PieChartProps {
  data: Array<{ name: string; value: number; percentage: number }>;
  title: string;
  colors?: string[];
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  title,
  colors = ['#2563eb', '#1d4ed8', '#0284c7', '#6366f1', '#0ea5e9', '#475569'],
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          Không có dữ liệu
        </div>
      </div>
    );
  }

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);
  const size = 200;
  const radius = 70;
  const centerX = size / 2;
  const centerY = size / 2;

  let currentAngle = -Math.PI / 2;
  const slices = data.map((item, idx) => {
    const slicePercentage = item.value / totalValue;
    const sliceAngle = slicePercentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    currentAngle = endAngle;

    return { pathData, color: colors[idx % colors.length], item };
  });

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="flex items-center justify-between gap-6">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {slices.map((slice, idx) => (
            <path
              key={idx}
              d={slice.pathData}
              fill={slice.color}
              className="hover:opacity-80 transition cursor-pointer"
            >
              <title>{slice.item.name}: {formatCompactCurrency(slice.item.value)} ({slice.item.percentage.toFixed(1)}%)</title>
            </path>
          ))}
        </svg>
        <div className="space-y-2">
          {data.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: colors[idx % colors.length] }}
              ></div>
              <span className="text-sm text-gray-900 dark:text-gray-300">
                {item.name}: {item.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface LineChartProps {
  data: Array<{ date: string; value: number }>;
  title: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ data, title, height = 300 }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-400">
          Không có dữ liệu
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const padding = 40;
  const chartWidth = Math.max(600, data.length * 60);
  const chartHeight = height;
  const pointSpacing = (chartWidth - padding * 2) / (data.length - 1 || 1);

  const points = data.map((item, idx) => {
    const x = padding + idx * pointSpacing;
    const y = chartHeight - padding - (item.value / maxValue) * (chartHeight - padding * 2);
    return { x, y, item };
  });

  const pathData = points.map((p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="overflow-x-auto">
        <svg width={chartWidth} height={chartHeight} className="mx-auto">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - padding - ratio * (chartHeight - padding * 2);
            const value = Math.round(maxValue * ratio);
            return (
              <g key={`grid-${ratio}`}>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="4"
                  className="dark:stroke-gray-700"
                />
                <text
                  x={padding - 10}
                  y={y + 4}
                  fontSize="12"
                  fill="#6b7280"
                  textAnchor="end"
                  className="dark:fill-gray-400"
                >
                  {formatCompactCurrency(value)}
                </text>
              </g>
            );
          })}

          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((p, idx) => (
            <g key={`point-${idx}`}>
              <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" className="hover:r-6 transition cursor-pointer" />
              <text
                x={p.x}
                y={chartHeight - padding + 20}
                fontSize="12"
                fill="#374151"
                textAnchor="middle"
                className="dark:fill-gray-400"
              >
                {p.item.date.slice(5)}
              </text>
            </g>
          ))}

          {/* Axes */}
          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#d1d5db"
            className="dark:stroke-gray-600"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="#d1d5db"
            className="dark:stroke-gray-600"
          />
        </svg>
      </div>
    </div>
  );
};
