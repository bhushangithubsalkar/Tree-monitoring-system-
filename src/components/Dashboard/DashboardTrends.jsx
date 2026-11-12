import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const colors = {
  Normal: '#16a34a',
  Warning: '#2563eb',
  Critical: '#dc2626',
};

function createTrend(tree, key, label, unit, warningThreshold, criticalThreshold) {
  const readings = tree?.health.readings || [];
  const values = readings.map((reading) => reading[key]);
  const latestValue = [...values].reverse().find((value) => value !== null) ?? null;
  const status = latestValue === null
    ? 'Normal'
    : latestValue >= criticalThreshold
      ? 'Critical'
      : latestValue >= warningThreshold
        ? 'Warning'
        : 'Normal';
  const color = colors[status];

  return {
    label,
    unit,
    latestValue,
    status,
    data: {
      labels: readings.map((_, index) => `Reading ${index + 1}`),
      datasets: [{
        data: values,
        borderColor: color,
        backgroundColor: `${color}22`,
        fill: true,
        tension: 0.3,
        spanGaps: true,
        pointRadius: 2,
        pointBackgroundColor: color,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Reading ${items[0]?.dataIndex + 1 || ''}`,
            label: (item) => `${item.formattedValue} ${unit}`,
          },
        },
      },
      scales: {
        x: { display: false, grid: { display: false } },
        y: { grid: { color: '#edf2ef' }, ticks: { maxTicksLimit: 4 } },
      },
    },
  };
}

export default function DashboardTrends({
  trees,
  selectedTree,
  selectedTreeId,
  onSelectTree,
  loading,
}) {
  const charts = selectedTree
    ? [
      createTrend(selectedTree, 'gas', 'MQ-2 Gas', 'PPM / analog', 10, 20),
      createTrend(selectedTree, 'soilMoisture', 'Soil Moisture', '%', 75, 90),
    ]
    : [];

  return (
    <section className="panel trends-panel">
      <div className="panel-header">
        <div>
          <h2>Latest Sensor Trends</h2>
          <p className="analytics-trend-subtitle">
            {selectedTree
              ? `${selectedTree.id} — ${selectedTree.health.name} • ${selectedTree.health.location}`
              : 'Sensor history from Firebase'}
          </p>
        </div>
        <select
          className="tree-trend-selector"
          value={selectedTreeId}
          onChange={(event) => onSelectTree(event.target.value)}
          disabled={trees.length === 0}
          aria-label="Select tree for sensor trends"
        >
          {trees.length === 0 ? <option value="">No trees available</option> : null}
          {trees.map((tree) => (
            <option key={tree.id} value={tree.id}>
              {tree.id} — {tree.health.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="trees-table-message">Loading sensor trends from Firebase…</p>
      ) : selectedTree ? (
        <div className="dashboard-trends-grid">
          {charts.map((chart) => (
            <div className="trend-box" key={chart.label}>
              <div className="trend-box-heading">
                <span>{chart.label}</span>
                <strong style={{ color: colors[chart.status] }}>
                  {chart.latestValue === null ? 'No data' : `${chart.latestValue} ${chart.unit}`}
                </strong>
              </div>
              {chart.latestValue === null ? (
                <div className="dashboard-trend-empty">No Firebase readings available</div>
              ) : (
                <div className="dashboard-trend-chart">
                  <Line data={chart.data} options={chart.options} />
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="trees-table-message">Add a tree to see sensor trends.</p>
      )}
    </section>
  );
}
