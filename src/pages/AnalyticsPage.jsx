import { useEffect, useMemo, useState } from 'react';
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
import { MapPin } from 'lucide-react';
import { onValue, ref } from 'firebase/database';
import { database } from '../firebase';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

const thresholdBandsPlugin = {
  id: 'thresholdBands',
  beforeDraw(chart, _args, options) {
    const bands = options.bands || [];
    const yScale = chart.scales.y;
    const { chartArea, ctx } = chart;
    if (!chartArea || !yScale || bands.length === 0) {
      return;
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
    ctx.clip();

    for (const band of bands) {
      const lower = Math.max(band.min, yScale.min);
      const upper = Math.min(band.max, yScale.max);
      if (lower >= upper) {
        continue;
      }

      const yTop = yScale.getPixelForValue(upper);
      const yBottom = yScale.getPixelForValue(lower);
      ctx.fillStyle = BAND_COLORS[band.status];
      ctx.fillRect(chartArea.left, yTop, chartArea.right - chartArea.left, yBottom - yTop);
    }

    ctx.restore();
  },
};

ChartJS.register(thresholdBandsPlugin);

const DAY_MS = 24 * 60 * 60 * 1000;
const ONLINE_TIMEOUT_MS = 5 * 60 * 1000;
const SEVERITY_ORDER = { Normal: 0, Warning: 1, Critical: 2 };
const SEVERITY_COLORS = {
  Normal: '#16a34a',
  Warning: '#2563eb',
  Critical: '#dc2626',
};
const BAND_COLORS = {
  Normal: 'rgba(22, 163, 74, 0.10)',
  Warning: 'rgba(37, 99, 235, 0.10)',
  Critical: 'rgba(220, 38, 38, 0.10)',
};

const sensorDefinitions = [
  { key: 'soilMoisture', title: 'Soil Moisture', unit: '%', aliases: ['soilMoisture', 'soil_moisture', 'moisture'] },
  { key: 'temperature', title: 'Temperature', unit: '°C', aliases: ['temperature', 'temp'] },
  { key: 'humidity', title: 'Humidity', unit: '% RH', aliases: ['humidity', 'relativeHumidity', 'relative_humidity'] },
  { key: 'gas', title: 'MQ-2 Gas', unit: 'PPM / analog', aliases: ['gasPPM', 'gas_ppm', 'gas_level', 'mq2', 'mq2_ppm', 'gas'] },
  { key: 'tilt', title: 'Gyro / Tilt', unit: '°', aliases: ['tilt', 'gyro_x', 'tiltAngle', 'tilt_angle', 'angle', 'gyro'] },
];

function readNumber(record, aliases) {
  for (const alias of aliases) {
    const value = record[alias];
    if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

function parseTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    if (/^\d{10,}$/.test(value)) {
      const numericValue = Number(value);
      return numericValue < 1e12 ? numericValue * 1000 : numericValue;
    }
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function normalizeReading(rawValue, key) {
  if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) {
    return null;
  }

  const nested = {
    ...(rawValue.sensors && typeof rawValue.sensors === 'object' ? rawValue.sensors : {}),
    ...(rawValue.latest && typeof rawValue.latest === 'object' ? rawValue.latest : {}),
    ...rawValue,
  };
  const timestamp = parseTimestamp(
    nested.timestamp ?? nested.time ?? nested.createdAt ?? nested.created_at ?? nested.ts ?? key,
  );
  const reading = {
    timestamp,
    soilMoisture: readNumber(nested, sensorDefinitions[0].aliases),
    temperature: readNumber(nested, sensorDefinitions[1].aliases),
    humidity: readNumber(nested, sensorDefinitions[2].aliases),
    gas: readNumber(nested, sensorDefinitions[3].aliases),
    tilt: readNumber(nested, sensorDefinitions[4].aliases),
  };

  return Object.values(reading).some((value) => typeof value === 'number') ? reading : null;
}

function readHistory(tree) {
  const history = tree.history || tree.readings || tree.sensorHistory || tree.sensor_history;
  if (!history || typeof history !== 'object') {
    return [];
  }

  const entries = Array.isArray(history)
    ? history.map((reading, index) => [String(index), reading])
    : Object.entries(history);

  return entries
    .map(([key, value]) => normalizeReading(value, key))
    .filter(Boolean)
    .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

function readTreeHistory(tree) {
  const history = readHistory(tree);
  const latest = normalizeReading(tree.latest, 'latest');
  if (latest && !history.some((reading) => reading.timestamp === latest.timestamp && latest.timestamp !== null)) {
    history.push(latest);
  }
  return history.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
}

function isTreeOnline(tree, recentReadings) {
  if (recentReadings.length === 0) {
    return false;
  }

  const latest = tree.latest && typeof tree.latest === 'object' ? tree.latest : {};
  const device = tree.device && typeof tree.device === 'object' ? tree.device : {};
  const explicitStatus = [tree.online, tree.isOnline, tree.deviceOnline, device.online, latest.online, latest.isOnline]
    .find((value) => typeof value === 'boolean');

  if (typeof explicitStatus === 'boolean') {
    return explicitStatus;
  }

  const latestReading = normalizeReading(latest, 'latest');
  const lastSeen = parseTimestamp(
    tree.lastSeen
      ?? tree.last_seen
      ?? tree.lastTelemetryAt
      ?? tree.last_telemetry_at
      ?? tree.telemetryUpdatedAt,
  );
  const timestamps = [
    ...recentReadings.map((reading) => reading.timestamp),
    latestReading?.timestamp,
    lastSeen,
  ].filter((timestamp) => timestamp !== null && timestamp !== undefined);
  const latestTimestamp = Math.max(...timestamps);

  return Number.isFinite(latestTimestamp)
    && latestTimestamp <= Date.now() + 60_000
    && Date.now() - latestTimestamp <= ONLINE_TIMEOUT_MS;
}

function getTreeLocation(tree) {
  const profile = tree.profile && typeof tree.profile === 'object' ? tree.profile : {};
  return tree.location || profile.location || profile.ward || profile.gps_coordinates || 'Location unavailable';
}

function getTreeSpecies(tree) {
  const profile = tree.profile && typeof tree.profile === 'object' ? tree.profile : {};
  return tree.species || profile.species || 'Unknown species';
}

function getTreeName(tree, id) {
  const profile = tree.profile && typeof tree.profile === 'object' ? tree.profile : {};
  return tree.name || profile.name || id;
}

function getRecentReadings(history) {
  const cutoff = Date.now() - DAY_MS;
  const timestamped = history.filter((reading) => reading.timestamp !== null);
  const recentReadings = timestamped.filter((reading) => reading.timestamp >= cutoff);
  return recentReadings.length ? recentReadings : history.slice(-24);
}

function hasSustainedCondition(readings, key, predicate, durationMs) {
  const matching = readings
    .filter((reading) => reading.timestamp !== null && reading[key] !== null && predicate(reading[key]))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (matching.length < 2) {
    return false;
  }

  let start = matching[0].timestamp;
  let previous = start;
  for (let index = 1; index < matching.length; index += 1) {
    const current = matching[index].timestamp;
    if (current - previous > DAY_MS) {
      start = current;
    }
    if (current - start >= durationMs) {
      return true;
    }
    previous = current;
  }
  return false;
}

function median(values) {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function hasRapidTilt(readings, index) {
  const previous = readings[index - 1];
  const current = readings[index];
  if (
    !previous
    || previous.timestamp === null
    || current.timestamp === null
    || previous.tilt === null
    || current.tilt === null
  ) {
    return false;
  }

  const interval = current.timestamp - previous.timestamp;
  return interval > 0 && interval <= 60_000 && Math.abs(current.tilt - previous.tilt) >= 2;
}

function getMetricSeverity(key, value, context) {
  if (value === null || !Number.isFinite(value)) {
    return null;
  }

  if (key === 'soilMoisture') {
    if (value > 90 || value < 10) {
      return context.extremeSoilSustained ? 'Critical' : 'Warning';
    }
    return value > 75 || value < 20 ? 'Warning' : 'Normal';
  }
  if (key === 'temperature') {
    if (value < 4 || value > 45) return 'Critical';
    return value < 25 || value > 38 ? 'Warning' : 'Normal';
  }
  if (key === 'humidity') {
    if (value > 90) return context.highHumiditySustained ? 'Critical' : 'Warning';
    return value > 70 || value < 40 ? 'Warning' : 'Normal';
  }
  if (key === 'gas') {
    if (value > Math.max(context.gasBaseline * 2, context.gasBaseline + 15)) return 'Critical';
    return value > Math.max(context.gasBaseline * 1.5, context.gasBaseline + 5) ? 'Warning' : 'Normal';
  }
  if (key === 'tilt') {
    if (context.rapidTilt) return 'Critical';
    if (value > 3) return 'Critical';
    return value >= 1 ? 'Warning' : 'Normal';
  }
  return 'Normal';
}

function getThresholdBands(sensor, context) {
  if (sensor.key === 'soilMoisture') {
    return {
      min: 0,
      max: 100,
      bands: [
        { min: 0, max: 10, status: 'Critical' },
        { min: 10, max: 20, status: 'Warning' },
        { min: 20, max: 75, status: 'Normal' },
        { min: 75, max: 90, status: 'Warning' },
        { min: 90, max: 100, status: 'Critical' },
      ],
    };
  }
  if (sensor.key === 'temperature') {
    return {
      min: -10,
      max: 55,
      bands: [
        { min: -10, max: 4, status: 'Critical' },
        { min: 4, max: 25, status: 'Warning' },
        { min: 25, max: 38, status: 'Normal' },
        { min: 38, max: 45, status: 'Warning' },
        { min: 45, max: 55, status: 'Critical' },
      ],
    };
  }
  if (sensor.key === 'humidity') {
    return {
      min: 0,
      max: 100,
      bands: [
        { min: 0, max: 40, status: 'Warning' },
        { min: 40, max: 70, status: 'Normal' },
        { min: 70, max: 90, status: 'Warning' },
        { min: 90, max: 100, status: 'Critical' },
      ],
    };
  }
  if (sensor.key === 'gas') {
    const warning = Math.max(context.gasBaseline * 1.5, context.gasBaseline + 5);
    const critical = Math.max(context.gasBaseline * 2, context.gasBaseline + 15);
    return {
      min: 0,
      max: Math.max(100, critical * 1.2),
      bands: [
        { min: 0, max: warning, status: 'Normal' },
        { min: warning, max: critical, status: 'Warning' },
        { min: critical, max: Math.max(100, critical * 1.2), status: 'Critical' },
      ],
    };
  }
  return {
    min: -5,
    max: 5,
    bands: [
      { min: -5, max: -3, status: 'Critical' },
      { min: -3, max: -1, status: 'Warning' },
      { min: -1, max: 1, status: 'Normal' },
      { min: 1, max: 3, status: 'Warning' },
      { min: 3, max: 5, status: 'Critical' },
    ],
  };
}

function getChartConfig(sensor, readings, context) {
  const values = readings.map((reading) => reading[sensor.key]);
  const validValues = values.some((value) => value !== null);
  const thresholds = getThresholdBands(sensor, context);
  const statuses = values.map((value, index) => getMetricSeverity(sensor.key, value, {
    ...context,
    rapidTilt: sensor.key === 'tilt' && hasRapidTilt(readings, index),
  }));

  return {
    labels: readings.map((_, index) => `Reading ${index + 1}`),
    thresholds,
    datasets: [{
      label: `${sensor.title} (${sensor.unit})`,
      data: values,
      spanGaps: true,
      borderWidth: 2.5,
      tension: 0.25,
      fill: false,
      pointRadius: 2,
      pointHoverRadius: 5,
      pointBorderWidth: 0,
      pointBackgroundColor: statuses.map((status) => SEVERITY_COLORS[status] || '#94a3b8'),
      segment: {
        borderColor: (segment) => {
          const firstStatus = statuses[segment.p0DataIndex];
          const secondStatus = statuses[segment.p1DataIndex];
          const status = (SEVERITY_ORDER[firstStatus] ?? 0) >= (SEVERITY_ORDER[secondStatus] ?? 0)
            ? firstStatus
            : secondStatus;
          return SEVERITY_COLORS[status] || '#94a3b8';
        },
        backgroundColor: (segment) => {
          const firstStatus = statuses[segment.p0DataIndex];
          const secondStatus = statuses[segment.p1DataIndex];
          const status = (SEVERITY_ORDER[firstStatus] ?? 0) >= (SEVERITY_ORDER[secondStatus] ?? 0)
            ? firstStatus
            : secondStatus;
          const color = SEVERITY_COLORS[status] || '#94a3b8';
          return `${color}20`;
        },
      },
    }],
    hasValues: validValues,
  };
}

const chartOptions = (unit, thresholds) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: 'index' },
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        title: (items) => `Reading ${items[0]?.dataIndex + 1 || ''}`,
        label: (item) => `${item.formattedValue} ${unit}`,
      },
    },
    thresholdBands: {
      bands: thresholds.bands,
    },
  },
  scales: {
    x: {
      display: false,
      grid: { display: false },
    },
    y: {
      min: thresholds.min,
      max: thresholds.max,
      grid: { color: '#edf2ef' },
      ticks: { color: '#788a80', maxTicksLimit: 5 },
    },
  },
});

export default function AnalyticsPage({ initialSelectedTreeId = '', onTreeSelect }) {
  const [trees, setTrees] = useState([]);
  const [selectedTreeId, setSelectedTreeId] = useState(initialSelectedTreeId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onValue(
      ref(database, 'trees'),
      (snapshot) => {
        const data = snapshot.val();
        const loadedTrees = data && typeof data === 'object'
          ? Object.entries(data).map(([id, value]) => ({
            id,
            data: value && typeof value === 'object' ? value : {},
          }))
          : [];

        setTrees(loadedTrees);
        const neemTree = loadedTrees.find((tree) => getTreeSpecies(tree.data).toLowerCase().includes('neem'));
        const defaultTreeId = (neemTree || loadedTrees[0])?.id || '';
        setSelectedTreeId((currentId) => {
          if (currentId && loadedTrees.some((tree) => tree.id === currentId)) {
            return currentId;
          }
          return defaultTreeId;
        });
        if (!initialSelectedTreeId) {
          onTreeSelect?.(defaultTreeId);
        }
        setError('');
        setLoading(false);
      },
      (firebaseError) => {
        setError(`Could not load analytics from Firebase: ${firebaseError.message}`);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [initialSelectedTreeId, onTreeSelect]);

  const selectedTree = trees.find((tree) => tree.id === selectedTreeId);
  const chartReadings = useMemo(() => {
    if (!selectedTree) {
      return [];
    }

    const history = readTreeHistory(selectedTree.data);
    return getRecentReadings(history);
  }, [selectedTree]);

  const statusContext = useMemo(() => {
    const allReadings = selectedTree ? readTreeHistory(selectedTree.data) : [];
    const sensorValues = allReadings.map((reading) => reading.gas).filter((value) => value !== null);
    const profile = selectedTree?.data.profile && typeof selectedTree.data.profile === 'object'
      ? selectedTree.data.profile
      : {};

    return {
      gasBaseline: Number(profile.gasBaseline ?? selectedTree?.data.gasBaseline) || median(sensorValues.slice(0, 3)),
      extremeSoilSustained:
        hasSustainedCondition(allReadings, 'soilMoisture', (value) => value > 90 || value < 10, 3 * DAY_MS),
      highHumiditySustained:
        hasSustainedCondition(allReadings, 'humidity', (value) => value > 90, DAY_MS),
    };
  }, [selectedTree]);

  const overallStatus = useMemo(() => {
    let status = chartReadings.length ? 'Normal' : 'No data';

    for (const [index, reading] of chartReadings.entries()) {
      for (const sensor of sensorDefinitions) {
        const sensorStatus = getMetricSeverity(sensor.key, reading[sensor.key], {
          ...statusContext,
          rapidTilt: sensor.key === 'tilt' && hasRapidTilt(chartReadings, index),
        });
        if (sensorStatus && (SEVERITY_ORDER[sensorStatus] ?? -1) > (SEVERITY_ORDER[status] ?? -1)) {
          status = sensorStatus;
        }
      }
    }
    return status;
  }, [chartReadings, statusContext]);

  const statusClass = overallStatus.toLowerCase().replace(' ', '-');
  const online = selectedTree ? isTreeOnline(selectedTree.data, chartReadings) : false;
  const connectionLabel = loading ? 'CHECKING' : online ? 'ONLINE' : 'OFFLINE';
  const chartReadingsForDisplay = chartReadings.length > 0
    ? chartReadings
    : Array.from({ length: 24 }, () => ({
      timestamp: null,
      soilMoisture: null,
      temperature: null,
      humidity: null,
      gas: null,
      tilt: null,
    }));

  return (
    <div className="analytics-page">
      <div className="dashboard-topbar">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Recent sensor readings from Firebase</p>
        </div>
      </div>

      <section className="panel analytics-location-panel">
        <div className="analytics-location">
          <MapPin size={18} aria-hidden="true" />
          <div>
            <span className="analytics-location-label">LOCATION</span>
            <h2>{selectedTree ? getTreeLocation(selectedTree.data) : 'Location unavailable'}</h2>
          </div>
        </div>
        <label className="analytics-tree-picker">
          <span>Tree</span>
          <select
            value={selectedTreeId}
            onChange={(event) => {
              setSelectedTreeId(event.target.value);
              onTreeSelect?.(event.target.value);
            }}
            disabled={trees.length === 0}
          >
            {trees.length === 0 ? <option value="">No trees available</option> : null}
            {trees.map((tree) => (
              <option key={tree.id} value={tree.id}>
                {tree.id} — {getTreeName(tree.data, tree.id)} ({getTreeSpecies(tree.data)})
              </option>
            ))}
          </select>
        </label>
      </section>

      <div className={`analytics-connection-status ${online ? 'online' : 'offline'}`} role="status">
        <span className="analytics-connection-dot" />
        {connectionLabel}
      </div>

      {loading ? (
        <div className="analytics-message">Loading readings from Firebase…</div>
      ) : (
        <>
          {error && <div className="trees-error-message" role="alert">{error}</div>}
          <div className="analytics-graphs-grid">
            {sensorDefinitions.map((sensor) => {
              const chart = getChartConfig(sensor, chartReadingsForDisplay, statusContext);
              return (
                <section className="panel analytics-chart-panel" key={sensor.key}>
                  <div className="analytics-chart-heading">
                    <h2>{sensor.title}</h2>
                    <span>{sensor.unit}</span>
                  </div>
                  <div className={`analytics-chart-canvas ${chart.hasValues ? '' : 'empty'}`}>
                    <Line data={chart} options={chartOptions(sensor.unit, chart.thresholds)} />
                    {!chart.hasValues && (
                      <span className="analytics-empty-overlay">No readings received</span>
                    )}
                  </div>
                  <div className="analytics-legend" aria-label="Status colors">
                    {['Normal', 'Warning', 'Critical'].map((status) => (
                      <span key={status}>
                        <i className={`analytics-legend-dot ${status.toLowerCase()}`} />
                        {status}
                      </span>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          <div className={`analytics-status-panel ${statusClass}`} role="status">
            <span>Tree Status</span>
            <strong>{overallStatus.toUpperCase()}</strong>
          </div>
        </>
      )}
    </div>
  );
}
