import { ref, runTransaction } from 'firebase/database';
import { database } from '../firebase';

const VALID_STATUSES = ['Normal', 'Warning', 'Critical'];

function getTreeLocation(tree) {
  const profile = tree.profile && typeof tree.profile === 'object' ? tree.profile : {};
  return tree.location || profile.location || profile.ward || profile.gps_coordinates || '';
}

export default function syncTreeAlert(treeId, tree) {
  const status = tree.latest?.status;
  if (!VALID_STATUSES.includes(status)) {
    return Promise.resolve();
  }

  const treeName = tree.name || tree.profile?.name || treeId;
  const location = getTreeLocation(tree);
  return runTransaction(ref(database, `Alerts/${treeId}`), (current) => {
    const now = Date.now();
    const alert = current && typeof current === 'object' ? current : {};

    if (status === 'Normal') {
      return alert.active
        ? { ...alert, status: 'Normal', active: false, resolvedAt: now, updatedAt: now }
        : current;
    }

    if (
      alert.active
      && alert.severity === status
      && alert.treeName === treeName
      && alert.location === location
    ) {
      return current;
    }

    const statusChanged = !alert.active || alert.severity !== status;
    return {
      treeId,
      treeName,
      location,
      severity: status,
      status,
      message: `${status} sensor status reported by this tree.`,
      active: true,
      triggeredAt: statusChanged ? now : alert.triggeredAt || now,
      updatedAt: now,
    };
  });
}
