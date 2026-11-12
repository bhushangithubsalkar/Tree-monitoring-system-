import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { onValue, ref } from 'firebase/database';
import Header from '../components/Dashboard/Header.jsx';
import MetricCards from '../components/Dashboard/MetricCards.jsx';
import MonitoredTrees from '../components/Dashboard/MonitoredTrees.jsx';
import AiConditionAnalysis from '../components/Dashboard/AiConditionAnalysis.jsx';
import { database } from '../firebase';

const DashboardTrends = lazy(() => import('../components/Dashboard/DashboardTrends.jsx'));

const DAY_MS = 24 * 60 * 60 * 1000;
const ONLINE_TIMEOUT_MS = 5 * 60 * 1000;
const SENSOR_FIELDS = {
  soilMoisture: ['soilMoisture', 'soil_moisture', 'moisture'],
  temperature: ['temperature', 'temp'],
  humidity: ['humidity', 'relativeHumidity', 'relative_humidity'],
  gas: ['gasPPM', 'gas_ppm', 'gas_level', 'mq2', 'mq2_ppm', 'gas'],
  tilt: ['tiltAngle', 'tilt_angle', 'angle', 'gyro'],
};

function getNestedObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstNumber(record, aliases) {
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

function normalizeReading(value, key = '') {
  const record = getNestedObject(value);
  const reading = {
    timestamp: parseTimestamp(
      record.timestamp ?? record.time ?? record.createdAt ?? record.created_at ?? record.ts ?? key,
    ),
    soilMoisture: firstNumber(record, SENSOR_FIELDS.soilMoisture),
    temperature: firstNumber(record, SENSOR_FIELDS.temperature),
    humidity: firstNumber(record, SENSOR_FIELDS.humidity),
    gas: firstNumber(record, SENSOR_FIELDS.gas),
    tilt: firstNumber(record, SENSOR_FIELDS.tilt),
  };
  return Object.values(reading).some((item) => typeof item === 'number') ? reading : null;
}

function getTreeReadings(tree) {
  const history = tree.history || tree.readings || tree.sensorHistory || tree.sensor_history;
  const entries = Array.isArray(history)
    ? history.map((reading, index) => [String(index), reading])
    : history && typeof history === 'object'
      ? Object.entries(history)
      : [];
  const readings = entries
    .map(([key, value]) => normalizeReading(value, key))
    .filter(Boolean);
  const latest = normalizeReading(tree.latest, 'latest');

  if (latest) {
    readings.push(latest);
  }

  const timestamped = readings.filter((reading) => reading.timestamp !== null);
  return timestamped.length
    ? timestamped.sort((a, b) => a.timestamp - b.timestamp)
    : readings.slice(-24);
}

function getRecentTreeReadings(tree) {
  const readings = getTreeReadings(tree);
  const cutoff = Date.now() - DAY_MS;
  const timestamped = readings.filter((reading) => reading.timestamp !== null);
  const recent = timestamped.length
    ? timestamped.filter((reading) => reading.timestamp >= cutoff)
    : readings.slice(-24);
  const latest = normalizeReading(tree.latest, 'latest');

  if (
    latest
    && latest.timestamp === null
    && !recent.some((reading) => Object.keys(SENSOR_FIELDS).every((key) => reading[key] === latest[key]))
  ) {
    recent.push(latest);
  }
  return recent;
}

function isOnline(tree, readings) {
  const latest = getNestedObject(tree.latest);
  const device = getNestedObject(tree.device);
  const explicit = [tree.online, tree.isOnline, tree.deviceOnline, device.online, latest.online, latest.isOnline]
    .find((value) => typeof value === 'boolean');

  if (typeof explicit === 'boolean') {
    return explicit;
  }

  const timestamps = [
    ...readings.map((reading) => reading.timestamp),
    parseTimestamp(tree.lastSeen ?? tree.last_seen ?? tree.lastTelemetryAt ?? tree.last_telemetry_at),
  ].filter((timestamp) => timestamp !== null);
  const lastTimestamp = Math.max(...timestamps);
  return Number.isFinite(lastTimestamp)
    && lastTimestamp <= Date.now() + 60_000
    && Date.now() - lastTimestamp <= ONLINE_TIMEOUT_MS;
}

function gasBaseline(tree, readings) {
  const configured = Number(tree.gasBaseline ?? getNestedObject(tree.profile).gasBaseline);
  if (Number.isFinite(configured) && configured > 0) {
    return configured;
  }
  const values = readings.map((reading) => reading.gas).filter((value) => value !== null).slice(0, 3).sort((a, b) => a - b);
  if (values.length === 0) {
    return 0;
  }
  return values[Math.floor(values.length / 2)];
}

function sustainedThreshold(readings, field, predicate, durationMs) {
  const matching = readings
    .filter((reading) => reading.timestamp !== null && reading[field] !== null && predicate(reading[field]))
    .sort((a, b) => a.timestamp - b.timestamp);

  if (matching.length < 2) return false;

  let start = matching[0].timestamp;
  let previous = start;
  for (const reading of matching.slice(1)) {
    if (reading.timestamp - previous > DAY_MS) start = reading.timestamp;
    if (reading.timestamp - start >= durationMs) return true;
    previous = reading.timestamp;
  }
  return false;
}

function getTreeHealth(tree) {
  const allReadings = getTreeReadings(tree);
  const readings = getRecentTreeReadings(tree);
  const latest = normalizeReading(tree.latest, 'latest')
    || allReadings[allReadings.length - 1]
    || null;
  const baseline = gasBaseline(tree, allReadings);
  const reasons = [];
  let status = latest ? 'Normal' : 'No data';

  const warn = (message) => {
    reasons.push(message);
    if (status === 'Normal' || status === 'No data') status = 'Warning';
  };
  const critical = (message) => {
    reasons.push(message);
    status = 'Critical';
  };

  if (latest) {
    if (latest.temperature !== null) {
      if (latest.temperature < 4 || latest.temperature > 45) {
        critical(`Temperature is ${latest.temperature}°C`);
      } else if (latest.temperature < 25 || latest.temperature > 38) {
        warn(`Temperature is ${latest.temperature}°C`);
      }
    }

    if (latest.humidity !== null) {
      if (latest.humidity > 90) warn(`Humidity is ${latest.humidity}% RH; check whether it remains high`);
      else if (latest.humidity < 40 || latest.humidity > 70) warn(`Humidity is ${latest.humidity}% RH`);
    }

    if (latest.soilMoisture !== null) {
      if (latest.soilMoisture < 10 || latest.soilMoisture > 90) {
        const sustained = sustainedThreshold(
          allReadings,
          'soilMoisture',
          (value) => latest.soilMoisture > 90 ? value > 90 : value < 10,
          3 * DAY_MS,
        );
        if (sustained) {
          critical(`Extreme soil moisture has persisted for more than 3 days`);
        } else {
          warn(`Soil moisture is ${latest.soilMoisture}%; verify duration and soil conditions`);
        }
      } else if (latest.soilMoisture < 20 || latest.soilMoisture > 75) {
        warn(`Soil moisture is ${latest.soilMoisture}%`);
      }
    }

    if (latest.humidity !== null && latest.humidity > 90 && sustainedThreshold(
      allReadings,
      'humidity',
      (value) => value > 90,
      DAY_MS,
    )) {
      critical('Humidity has remained above 90% for at least 24 hours');
    }

    if (latest.gas !== null && baseline > 0) {
      if (latest.gas > Math.max(baseline * 2, baseline + 15)) {
        critical('MQ-2 reading shows a sharp rise from its baseline');
      } else if (latest.gas > Math.max(baseline * 1.5, baseline + 5)) {
        warn('MQ-2 reading is rising above its baseline');
      }
    }

    if (latest.tilt !== null) {
      if (latest.tilt > 3) critical(`Tilt is ${latest.tilt}°`);
      else if (latest.tilt >= 1) warn(`Tilt is ${latest.tilt}°`);
    }
  }

  const profile = getNestedObject(tree.profile);
  const location = tree.location || profile.location || profile.ward || profile.gps_coordinates || 'Location unavailable';
  const species = tree.species || profile.species || 'Unknown species';
  const name = tree.name || profile.name || species;

  return {
    readings,
    allReadings,
    latest,
    status,
    reasons,
    location,
    species,
    name,
    online: isOnline(tree, readings),
  };
}

export default function DashboardPage({ onNavigate }) {
  const [trees, setTrees] = useState([]);
  const [reportsCount, setReportsCount] = useState(0);
  const [loadingTrees, setLoadingTrees] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [treeError, setTreeError] = useState('');
  const [reportsError, setReportsError] = useState('');
  const [selectedTreeId, setSelectedTreeId] = useState('');

  useEffect(() => {
    const unsubscribeTrees = onValue(
      ref(database, 'trees'),
      (snapshot) => {
        const data = snapshot.val();
        const loadedTrees = data && typeof data === 'object'
          ? Object.entries(data).map(([key, value]) => ({
            databaseKey: key,
            id: value?.id || key,
            data: getNestedObject(value),
          }))
          : [];

        setTrees(loadedTrees);
        setSelectedTreeId((currentId) => (
          loadedTrees.some((tree) => tree.id === currentId)
            ? currentId
            : loadedTrees[0]?.id || ''
        ));
        setLoadingTrees(false);
        setTreeError('');
      },
      (error) => {
        setTreeError(`Could not load dashboard trees: ${error.message}`);
        setLoadingTrees(false);
      },
    );

    const unsubscribeReports = onValue(
      ref(database, 'reports'),
      (snapshot) => {
        const data = snapshot.val();
        setReportsCount(data && typeof data === 'object' ? Object.keys(data).length : 0);
        setLoadingReports(false);
        setReportsError('');
      },
      (error) => {
        setReportsError(`Could not load public reports: ${error.message}`);
        setLoadingReports(false);
      },
    );

    return () => {
      unsubscribeTrees();
      unsubscribeReports();
    };
  }, []);

  const treeSummaries = useMemo(
    () => trees.map((tree) => ({ ...tree, health: getTreeHealth(tree.data) })),
    [trees],
  );
  const selectedTree = treeSummaries.find((tree) => tree.id === selectedTreeId) || treeSummaries[0];
  const activeAlerts = treeSummaries.filter(
    (tree) => tree.health.status === 'Warning' || tree.health.status === 'Critical',
  ).length;
  const onlineTrees = treeSummaries.filter((tree) => tree.health.online).length;
  const healthSummary = treeSummaries.reduce((summary, tree) => {
    const rank = { 'No data': 0, Normal: 1, Warning: 2, Critical: 3 };
    return !summary || rank[tree.health.status] > rank[summary.health.status] ? tree : summary;
  }, null);

  return (
    <>
      <Header title="Dashboard" subtitle="Live overview of monitored trees" />
      {treeError && <p className="trees-error-message" role="alert">{treeError}</p>}
      {reportsError && <p className="trees-error-message" role="alert">{reportsError}</p>}
      <MetricCards
        totalTrees={trees.length}
        onlineTrees={onlineTrees}
        alerts={activeAlerts}
        reports={reportsCount}
        loadingTrees={loadingTrees}
        loadingReports={loadingReports}
      />

      <div className="dashboard-grid-row">
        <MonitoredTrees
          trees={treeSummaries}
          loading={loadingTrees}
          error={treeError}
          onAddTree={() => onNavigate?.('trees')}
        />
        <AiConditionAnalysis
          health={healthSummary?.health}
          loading={loadingTrees}
          onViewAnalytics={() => {
            if (healthSummary) {
              onNavigate?.('analytics', healthSummary.id);
            }
          }}
        />
      </div>

      <Suspense fallback={<div className="analytics-message">Loading sensor trends…</div>}>
        <DashboardTrends
          trees={treeSummaries}
          selectedTree={selectedTree}
          selectedTreeId={selectedTree?.id || selectedTreeId}
          onSelectTree={setSelectedTreeId}
          loading={loadingTrees}
        />
      </Suspense>
    </>
  );
}
