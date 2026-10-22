'use strict';
/** Study-only material: NEVER import from astrology-engine or place into rendered charts. */
const table = require('./tuong-tien-study-table.json');
const mod12 = value => ((value % 12) + 12) % 12;
function calculateStudyCircle(yearBranch) {
  if (!Number.isInteger(yearBranch) || yearBranch < 0 || yearBranch > 11) {
    throw new RangeError('Địa chi tham chiếu phải là số nguyên 0–11');
  }
  const start = table.groupStartByYearBranch[yearBranch];
  return Object.freeze(table.orderedNames.map((name, offset) => Object.freeze({
    name, branchIndex: mod12(start + offset), branch: table.branches[mod12(start + offset)]
  })));
}
function getStudyRow(yearBranch) {
  if (!Number.isInteger(yearBranch) || yearBranch < 0 || yearBranch > 11) throw new RangeError('Địa chi ngoài phạm vi nghiên cứu');
  return table.rows[yearBranch];
}
module.exports = Object.freeze({studyTable: table, calculateStudyCircle, getStudyRow});
