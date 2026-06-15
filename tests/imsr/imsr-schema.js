/* ============================================================
   imsr-schema.js — normalized IMSR schema definitions.

   PURE DATA. No logic, no DOM, no app imports. This file only DESCRIBES the
   shape we expect a (hand-verified) IMSR fixture to have. The validator
   (imsr-validator.js) reads these specs; the live app never imports this.

   Scope reminder: this is a VALIDATION SCAFFOLD only. Nothing here is wired
   into the map, ranking, PL thinning, popups, or any runtime path.
   ============================================================ */

export const SCHEMA_VERSION = '0.1.0-scaffold';

/* Where a fixture's data claims to come from. MANUAL_FIXTURE = hand-entered
   test data (the only thing we trust today). The PDF / open-data values are
   declared but NOT trusted — extraction is unproven. */
export const SOURCE_TYPES = ['MANUAL_FIXTURE', 'IMSR_PDF', 'IMSR_OPENDATA'];

/* ---------- Readiness ladder (deliberately conservative) ----------
   Ordered worst → best. The TOP of this ladder is "a human looked at it",
   NOT "safe for production". There is intentionally no production state here.
     INVALID             — hard structural / type errors; do not use.
     PARTIAL             — parseable but incomplete (a recommended bucket is
                           missing or empty); shape is not fully present.
     STRUCTURALLY_VALID  — all required structure + types present, but NO human
                           has attested to the values.
     HUMAN_VERIFIED_ONLY — structurally valid AND a person recorded that they
                           checked it. Still only a human's word — never assume
                           the numbers are correct, and never auto-integrate. */
export const READINESS = {
  INVALID:             'INVALID',
  PARTIAL:             'PARTIAL',
  STRUCTURALLY_VALID:  'STRUCTURALLY_VALID',
  HUMAN_VERIFIED_ONLY: 'HUMAN_VERIFIED_ONLY',
};
/* Ascending severity/quality order, for ranking / comparisons. */
export const READINESS_ORDER = [
  READINESS.INVALID,
  READINESS.PARTIAL,
  READINESS.STRUCTURALLY_VALID,
  READINESS.HUMAN_VERIFIED_ONLY,
];

/* ---------- meta envelope ----------
   Every fixture carries a meta block: what it is, when it's for, and a
   PROVENANCE / VERIFICATION sub-block recording who (if anyone) checked it. */
export const META_FIELDS = [
  { key: 'source_type',   type: 'nonempty_string', required: true, oneOf: SOURCE_TYPES },
  { key: 'source_date',   type: 'iso_date',        required: true,  note: 'date the IMSR covers (YYYY-MM-DD)' },
  { key: 'is_fixture',    type: 'boolean',         required: true,  note: 'true = fake / hand-entered, not live data' },
  { key: 'report_label',  type: 'string',          required: false },
  { key: 'parser_version',type: 'string',          required: false },
  { key: 'ingested_at',   type: 'string',          required: false, note: 'when this fixture was created (ISO datetime)' },
  { key: 'notes',         type: 'string',          required: false },
  // Verification block is required to be PRESENT (provenance must always exist);
  // its contents may be null when nobody has verified yet (see VERIFICATION_FIELDS).
  { key: 'verification',  type: 'object',          required: true },
];

/* Provenance / verification sub-block. All keys must be PRESENT (the shape is
   mandatory) but each VALUE may be null when unverified. Human verification is
   considered done only when verified_by AND verification_method are non-empty. */
export const VERIFICATION_FIELDS = [
  { key: 'verified_by',         type: 'string_or_null', required: true, note: 'who attested to these values' },
  { key: 'verified_at',         type: 'string_or_null', required: true, note: 'when they attested (ISO datetime)' },
  { key: 'verification_method', type: 'string_or_null', required: true, note: 'how, e.g. MANUAL_FIXTURE_ENTRY / SPOT_CHECK_VS_PDF' },
  { key: 'verification_notes',  type: 'string_or_null', required: true, note: 'free-text caveats' },
];

/* ---------- Bucket 1: gac_pl_daily ----------
   Per Geographic Area Coordination Center (GACC) preparedness level, per day. */
export const GAC_PL_FIELDS = [
  { key: 'gacc',               type: 'nonempty_string', required: true,  note: 'GACC abbreviation, e.g. NW / SW / GB' },
  { key: 'gacc_name',          type: 'string',          required: false },
  { key: 'preparedness_level', type: 'integer',         required: true,  range: [1, 5] },
  { key: 'date',               type: 'iso_date',        required: true },
];

/* ---------- Bucket 2: national_resource_totals_daily ----------
   National committed-resource totals for the day (single object, not a list). */
export const NATIONAL_FIELDS = [
  { key: 'date',                       type: 'iso_date', required: true },
  { key: 'national_preparedness_level',type: 'integer',  required: false, range: [1, 5] },
  { key: 'totals',                     type: 'object',   required: true },
];
export const NATIONAL_TOTALS_FIELDS = [
  { key: 'crews',           type: 'number', required: false, min: 0 },
  { key: 'engines',         type: 'number', required: false, min: 0 },
  { key: 'helicopters',     type: 'number', required: false, min: 0 },
  { key: 'overhead',        type: 'number', required: false, min: 0 },
  { key: 'total_personnel', type: 'number', required: true,  min: 0 },
];

/* ---------- Bucket 3: incident_resources_daily ----------
   Per large incident, resources committed that day. lat/lng are nullable on
   purpose: we do NOT trust geocoding yet, so a fixture may omit/null them. */
export const INCIDENT_FIELDS = [
  { key: 'incident_id',       type: 'nonempty_string', required: true },
  { key: 'incident_name',     type: 'nonempty_string', required: true },
  { key: 'gacc',              type: 'string',          required: false },
  { key: 'state',             type: 'string',          required: false },
  { key: 'date',              type: 'iso_date',        required: true },
  { key: 'size_acres',        type: 'number',          required: false, min: 0 },
  { key: 'percent_contained', type: 'number',          required: false, range: [0, 100] },
  { key: 'resources',         type: 'object',          required: true },
  { key: 'lat',               type: 'number_or_null',  required: false },
  { key: 'lng',               type: 'number_or_null',  required: false },
];
export const INCIDENT_RESOURCE_FIELDS = [
  { key: 'crews',           type: 'number', required: false, min: 0 },
  { key: 'engines',         type: 'number', required: false, min: 0 },
  { key: 'helicopters',     type: 'number', required: false, min: 0 },
  { key: 'total_personnel', type: 'number', required: false, min: 0 },
];

/* ---------- Bucket registry ----------
   Drives the validator generically. `recommended` buckets that are absent or
   empty drop readiness to PARTIAL (soft), they are not hard errors. */
export const BUCKETS = {
  gac_pl_daily: {
    kind: 'array', recommended: true, minRecords: 1,
    recordFields: GAC_PL_FIELDS,
  },
  national_resource_totals_daily: {
    kind: 'object', recommended: true,
    objectFields: NATIONAL_FIELDS,
    subObjects: { totals: NATIONAL_TOTALS_FIELDS },
  },
  incident_resources_daily: {
    kind: 'array', recommended: true, minRecords: 1,
    recordFields: INCIDENT_FIELDS,
    recordSubObjects: { resources: INCIDENT_RESOURCE_FIELDS },
  },
};

export const BUCKET_NAMES = Object.keys(BUCKETS);
