/* ============================================================
   imsr-validator.js — pure, validation-first IMSR fixture checker.

   PURE FUNCTION. No DOM, no Leaflet, no app imports. Imports only the schema
   spec. Mirrors the project's existing in-browser test convention (see
   tests/coverage.test.js): pure modules that the harness page exercises.

   What it does: takes a parsed fixture object and reports whether it MATCHES
   THE EXPECTED SHAPE. It explicitly does NOT — and cannot — judge whether the
   VALUES are correct. A fixture can be perfectly structured and still be wrong.
   That is why the best readiness state is HUMAN_VERIFIED_ONLY, never anything
   resembling "production ready".
   ============================================================ */

import {
  SCHEMA_VERSION, READINESS, META_FIELDS, VERIFICATION_FIELDS,
  BUCKETS, BUCKET_NAMES,
} from './imsr-schema.js';

/* ---------- low-level type checks ---------- */
function isPlainObject(v) { return v != null && typeof v === 'object' && !Array.isArray(v); }
function describe(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}
function checkType(val, type) {
  switch (type) {
    case 'string':         return typeof val === 'string';
    case 'nonempty_string':return typeof val === 'string' && val.trim().length > 0;
    case 'number':         return typeof val === 'number' && Number.isFinite(val);
    case 'integer':        return Number.isInteger(val);
    case 'boolean':        return typeof val === 'boolean';
    case 'object':         return isPlainObject(val);
    case 'array':          return Array.isArray(val);
    case 'iso_date':       return typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
    case 'string_or_null': return val === null || typeof val === 'string';
    case 'number_or_null': return val === null || (typeof val === 'number' && Number.isFinite(val));
    default:               return false;
  }
}
function nonEmptyStr(v) { return typeof v === 'string' && v.trim().length > 0; }

/* A "sink" collects findings at three severities:
     errors  → hard structural/type problems  → readiness INVALID
     soft    → recommended content absent/empty → readiness at most PARTIAL
     warnings→ quality notes; never lower readiness
   missing  → dotted paths of required fields that were absent (deliverable) */
function makeSink() { return { errors: [], soft: [], warnings: [], missing: [] }; }

/* Validate a flat object against a list of field specs, recording into sink. */
function validateFields(obj, fields, basePath, sink) {
  for (const f of fields) {
    const path = `${basePath}.${f.key}`;
    const has = isPlainObject(obj) && Object.prototype.hasOwnProperty.call(obj, f.key);
    if (!has) {
      if (f.required) { sink.errors.push(`${path}: required field missing`); sink.missing.push(path); }
      else { sink.warnings.push(`${path}: optional field absent`); }
      continue;
    }
    const val = obj[f.key];
    if (!checkType(val, f.type)) {
      sink.errors.push(`${path}: expected ${f.type}, got ${describe(val)}`);
      continue;
    }
    if (f.oneOf && !f.oneOf.includes(val))
      sink.errors.push(`${path}: "${val}" is not one of [${f.oneOf.join(', ')}]`);
    if (f.range && typeof val === 'number' && (val < f.range[0] || val > f.range[1]))
      sink.errors.push(`${path}: ${val} out of range ${f.range[0]}..${f.range[1]}`);
    if (f.min != null && typeof val === 'number' && val < f.min)
      sink.errors.push(`${path}: ${val} below minimum ${f.min}`);
  }
}

/* ---------- the validator ---------- */
export function validateImsrFixture(fixture) {
  const sink = makeSink();

  // Top-level must be an object.
  if (!isPlainObject(fixture)) {
    return finalize(fixture, sink, { fatal: true });
  }

  // --- meta + provenance/verification ---
  const meta = fixture.meta;
  if (!isPlainObject(meta)) {
    sink.errors.push('meta: required object missing');
    sink.missing.push('meta');
  } else {
    validateFields(meta, META_FIELDS, 'meta', sink);
    if (isPlainObject(meta.verification)) {
      validateFields(meta.verification, VERIFICATION_FIELDS, 'meta.verification', sink);
    } // if absent/not-an-object, the META_FIELDS check above already flagged it
  }

  // --- buckets ---
  for (const name of BUCKET_NAMES) {
    const spec = BUCKETS[name];
    const present = Object.prototype.hasOwnProperty.call(fixture, name);
    if (!present) {
      if (spec.recommended) sink.soft.push(`${name}: recommended bucket absent`);
      continue;
    }
    const val = fixture[name];

    if (spec.kind === 'array') {
      if (!Array.isArray(val)) {
        sink.errors.push(`${name}: expected array, got ${describe(val)}`);
        continue;
      }
      if (val.length === 0 && spec.recommended) sink.soft.push(`${name}: present but empty`);
      val.forEach((rec, i) => {
        const p = `${name}[${i}]`;
        if (!isPlainObject(rec)) { sink.errors.push(`${p}: expected object, got ${describe(rec)}`); return; }
        validateFields(rec, spec.recordFields, p, sink);
        if (spec.recordSubObjects) {
          for (const [subKey, subFields] of Object.entries(spec.recordSubObjects)) {
            if (isPlainObject(rec[subKey])) {
              validateFields(rec[subKey], subFields, `${p}.${subKey}`, sink);
              if (Object.keys(rec[subKey]).length === 0)
                sink.warnings.push(`${p}.${subKey}: no resource counts provided`);
            }
          }
        }
      });
    } else { // object bucket
      if (!isPlainObject(val)) {
        sink.errors.push(`${name}: expected object, got ${describe(val)}`);
        continue;
      }
      validateFields(val, spec.objectFields, name, sink);
      if (spec.subObjects) {
        for (const [subKey, subFields] of Object.entries(spec.subObjects)) {
          if (isPlainObject(val[subKey])) validateFields(val[subKey], subFields, `${name}.${subKey}`, sink);
        }
      }
    }
  }

  return finalize(fixture, sink, { fatal: false });
}

/* Roll the sink up into the final report (the documented output shape). */
function finalize(fixture, sink, { fatal }) {
  const meta = isPlainObject(fixture) ? fixture.meta : null;
  const verification = isPlainObject(meta) ? meta.verification : null;

  const source_date = isPlainObject(meta) && checkType(meta.source_date, 'iso_date') ? meta.source_date : null;
  const source_type = isPlainObject(meta) && nonEmptyStr(meta.source_type) ? meta.source_type : null;
  const is_fixture  = isPlainObject(meta) ? meta.is_fixture === true : false;

  // Human verification = someone recorded WHO checked it AND HOW.
  const humanVerified = isPlainObject(verification)
    && nonEmptyStr(verification.verified_by)
    && nonEmptyStr(verification.verification_method);

  const hasErrors = fatal || sink.errors.length > 0;
  const hasSoft   = sink.soft.length > 0;

  // Conservative readiness ladder.
  let readiness;
  if (hasErrors)            readiness = READINESS.INVALID;
  else if (hasSoft)         readiness = READINESS.PARTIAL;
  else if (humanVerified)   readiness = READINESS.HUMAN_VERIFIED_ONLY;
  else                      readiness = READINESS.STRUCTURALLY_VALID;

  // Coarse status summary (kept alongside the four-state readiness flag).
  const validation_status =
    readiness === READINESS.INVALID ? 'invalid' :
    readiness === READINESS.PARTIAL ? 'partial' : 'valid';

  // STRUCTURAL confidence only — never an assertion that the VALUES are right.
  // Capped at 0.9 so even a human-verified fixture never reads as fully trusted.
  let parse_confidence = 0;
  if (!hasErrors) parse_confidence += 0.5; // parses + types ok
  if (!hasSoft)   parse_confidence += 0.2; // all recommended buckets present
  if (humanVerified) parse_confidence += 0.2; // a person attested
  parse_confidence = Math.round(parse_confidence * 100) / 100;

  // Per-bucket summary (presence + counts + how many findings touched it).
  const buckets = {};
  for (const name of BUCKET_NAMES) {
    const present = isPlainObject(fixture) && Object.prototype.hasOwnProperty.call(fixture, name);
    const val = present ? fixture[name] : undefined;
    const count = Array.isArray(val) ? val.length : (present ? 1 : 0);
    const issues = [...sink.errors, ...sink.soft].filter(s => s.startsWith(name)).length;
    buckets[name] = { present, count, issues };
  }

  const ok = readiness === READINESS.STRUCTURALLY_VALID || readiness === READINESS.HUMAN_VERIFIED_ONLY;

  return {
    ok,
    schema_version: SCHEMA_VERSION,
    checked_at: new Date().toISOString(),
    source_date,
    source_type,
    is_fixture,
    human_verified: humanVerified,
    validation_status,
    readiness_flag: readiness,
    parse_confidence,
    confidence_basis: 'structural-only — does NOT assert the values are correct',
    buckets,
    missing_fields: sink.missing,
    errors: sink.errors,
    soft_issues: sink.soft,
    warnings: sink.warnings,
  };
}

/* One-line human summary, handy for console logging. */
export function formatReportLine(report, label = 'fixture') {
  return `[imsr] ${label}: ${report.readiness_flag} (status=${report.validation_status}, ` +
         `conf=${report.parse_confidence}, errors=${report.errors.length}, ` +
         `missing=${report.missing_fields.length}, soft=${report.soft_issues.length})`;
}
