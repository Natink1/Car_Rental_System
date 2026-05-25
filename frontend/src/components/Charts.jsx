import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';

const defaultColors = ['#1d4ed8', '#f97316', '#10b981', '#ef4444', '#7c3aed'];

export function DonutChart({ title, data = [], colors = defaultColors }) {
  const total = (data || []).reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
      {total > 0 ? (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} label>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>No data</div>
      )}
    </div>
  );
}

export function SimpleBarChart({ title, data = [], colors = ['#1d4ed8'] }) {
  const hasData = (data || []).some((d) => (d.value || 0) > 0);

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
      {hasData ? (
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill={colors[0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>No data</div>
      )}
    </div>
  );
}

export function Sparkline({ title, data = [], dataKey = 'value', color = '#1d4ed8' }) {
  const hasData = (data || []).length > 0;

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
      {hasData ? (
        <div style={{ width: '100%', height: 90 }}>
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="name" hide />
              <YAxis hide />
              <Tooltip />
              <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill="url(#colorUv)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>No data</div>
      )}
    </div>
  );
}

export function MultiLineChart({ title, data = [], series = [{ key: 'value', name: 'Value', color: '#1d4ed8', yAxisId: 'left' }], height = 320 }) {
  const hasData = (data || []).length > 0;
  const hasRightAxis = series.some((s) => s.yAxisId === 'right');

  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{title}</div>
      {hasData ? (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis yAxisId="left" />
              {hasRightAxis && <YAxis yAxisId="right" orientation="right" />}
              <Tooltip />
              <Legend />
              {series.map((s, idx) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.name || s.key}
                  stroke={s.color || defaultColors[idx % defaultColors.length]}
                  yAxisId={s.yAxisId || 'left'}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)' }}>No data</div>
      )}
    </div>
  );
}

export default DonutChart;
