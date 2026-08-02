import React from 'react';

export function Skeleton({ height = 16, width = '100%', circle = false, style = {} }) {
  return (
    <div
      className="skeleton"
      style={{
        height,
        width,
        borderRadius: circle ? '50%' : 'var(--radius-md)',
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton height={14} width="55%" />
      <Skeleton height={40} width="70%" />
      <Skeleton height={12} width="40%" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i}><Skeleton height={10} width="80%" /></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c}><Skeleton height={12} width={c === 0 ? '60%' : '80%'} /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Skeleton;
