'use strict';
/** Versioned editorial records. Computation of palaces/stars is exclusively in astrology-engine. */
const {edition,topics} = require('./palace-topics.json');
const fourCourtResearch = require('./four-court-research.json');
const {edition:symbolEdition,records:starSymbols} = require('./star-symbols.json');
const starDossiers = require('./star-dossiers.json');
const starCycleStudy = require('./star-cycle-study.json');
const starCriticalReadings = require('./star-critical-readings.json');
const {edition:natalExtensionCatalogueEdition,records:natalExtensionCatalogue} = require('./natal-extension-catalogue.json');
const {edition:traditionalCatalogueEdition,records:traditionalCatalogue} = require('./traditional-star-catalogue.json');
const {edition:combinationEdition,rules:combinationRules} = require('./combination-rules.json');
const {records:obstructionSymbols} = require('./obstruction-symbols.json');
const {edition:relationshipEdition,rules:relationshipPatterns} = require('./relationship-patterns.json');
const {edition:classicalEdition,rules:classicalFamilies} = require('./classical-families.json');
const {edition:adjacentEdition,rules:adjacentPalacePatterns} = require('./adjacent-palace-patterns.json');
const {edition:geometryEdition,rules:natalGeometryRules} = require('./natal-geometry-rules.json');
const {primaryStarPalaceGuidance} = require('./primary-guidance.cjs');
const capabilityRegistry = require('./capability-registry.cjs');
const starIdentityRegistry = require('./star-identity-registry.cjs');
const referenceStarCrosswalk = require('./reference-star-crosswalk.json');
const referenceVerification = require('./reference-verification.cjs');
const researchDisciplines = require('./research-disciplines.json');
const phase2Schools = require('./phase2-school-methods.cjs');
const starFamilyResearch = require('./star-family-research.json');
const expandedStarResearch = require('./expanded-star-research.json');
const tuongTienStudy = require('./tuong-tien-study.cjs');
const methodComparison = require('./method-comparison.cjs');
const palaceRelationalSynthesis = require('./palace-relational-synthesis.json');
const schoolReview = require('./school-review-gates.cjs');
const schoolValidationProtocols = require('./school-validation-protocols.cjs');
function lookupStarCycleStudy(name) {
 if (typeof name !== 'string') return null;
 for (const cycle of starCycleStudy.cycles) {
  const index = cycle.orderedNames.indexOf(name);
  if (index !== -1) return {
   cycle:cycle.name, order:index+1, total:cycle.count,
   previous:cycle.orderedNames[(index+11)%12],next:cycle.orderedNames[(index+1)%12],
   methodology:cycle.methodology
  };
 }
 return null;
}
const palaceNames = Object.freeze(Object.keys(topics));
function lookupPrimaryStarPalace(star, palace) {
  if (typeof star !== 'string' || typeof palace !== 'string') return null;
  const record = primaryStarPalaceGuidance.records[star];
  return record && Object.hasOwn(record, palace) ? record[palace] : null;
}
function lookupPalace(name) { return Object.hasOwn(topics,name) ? topics[name] : null; }
function lookupObstruction(name) { return typeof name==='string' && Object.hasOwn(obstructionSymbols,name) ? obstructionSymbols[name] : null; }
function lookupSymbol(name) { return typeof name==='string' && Object.hasOwn(starSymbols,name) ? starSymbols[name] : null; }
function lookupStarCriticalReading(name) { return typeof name === 'string' && Object.hasOwn(starCriticalReadings.records,name) ? starCriticalReadings.records[name] : null; }
function lookupStarDossier(name) { return typeof name==='string' && Object.hasOwn(starDossiers.profiles,name) ? starDossiers.profiles[name] : null; }
module.exports = {phase2Schools,referenceVerification,schoolValidationProtocols,schoolReview,palaceRelationalSynthesis,fourCourtResearch,capabilityRegistry,starIdentityRegistry,referenceStarCrosswalk,researchDisciplines,starFamilyResearch,expandedStarResearch,tuongTienStudy,methodComparison,primaryStarPalaceGuidance,lookupPrimaryStarPalace,edition,topics,palaceNames,lookupPalace,traditionalCatalogueEdition,traditionalCatalogue,natalExtensionCatalogueEdition,natalExtensionCatalogue,symbolEdition,starSymbols,lookupSymbol,starDossiers,lookupStarDossier,starCriticalReadings,lookupStarCriticalReading,starCycleStudy,lookupStarCycleStudy,obstructionSymbols,lookupObstruction,combinationEdition,combinationRules,relationshipEdition,relationshipPatterns,classicalEdition,classicalFamilies,adjacentEdition,adjacentPalacePatterns,geometryEdition,natalGeometryRules};
