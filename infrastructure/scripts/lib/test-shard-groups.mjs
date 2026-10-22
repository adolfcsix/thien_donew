/** Partition each test exactly once. Isolate the known 201-year CPU audit. */
export const MAX_TEST_GROUPS=6;
export const TEST_GROUP_TIMEOUT_MS=90_000;
export const TEST_RUNNER_TIMEOUT_MS=MAX_TEST_GROUPS*TEST_GROUP_TIMEOUT_MS+60_000;
export function buildTestGroups(files){
 if(!Array.isArray(files)||!files.length||files.some(f=>typeof f!=='string'||!f)||new Set(files).size!==files.length)
  throw new TypeError('Test file list must be nonempty, unique strings');
 const heavy='tests/v1123-temporal-audit.test.cjs';
 const isolated=files.includes(heavy)?[[heavy]]:[];
 const rest=files.filter(file=>!isolated.length||file!==heavy);
 const count=Math.min(MAX_TEST_GROUPS-isolated.length,rest.length);
 const groups=[...isolated,...Array.from({length:count},(_,group)=>rest.filter((_,index)=>index%count===group))];
 const flattened=groups.flat();
 if(flattened.length!==files.length||new Set(flattened).size!==files.length||files.some(file=>!flattened.includes(file)))
  throw new Error('Test shard partition lost or duplicated files');
 return groups;
}
