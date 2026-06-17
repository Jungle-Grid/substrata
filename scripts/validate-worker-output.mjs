import fs from 'node:fs';
import path from 'node:path';

const [outputPathArg, ...rest] = process.argv.slice(2);

if (!outputPathArg) {
  console.error('Usage: node scripts/validate-worker-output.mjs <output-json-path> [--min-specs=8]');
  process.exit(1);
}

const minSpecsArg = rest.find((value) => value.startsWith('--min-specs='));
const minSpecs = minSpecsArg ? Number(minSpecsArg.split('=')[1]) : 8;
const outputPath = path.resolve(outputPathArg);
const payload = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
const payloadText = JSON.stringify(payload).toLowerCase();
const strongFactNames = new Set([
  'manufacturer',
  'part_number',
  'adc_resolution',
  'channel_modes',
  'single_channel_sample_rate',
  'dual_channel_sample_rate',
  'sample_rate',
  'input_bandwidth',
  'usable_input_frequency_range',
  'jesd_interface',
  'jesd_other_references',
  'serial_lane_rate',
  'interface_lane_count',
  'application_examples',
  'package_type',
  'power_consumption',
]);

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(Array.isArray(payload.extracted_specs), 'Output is missing extracted_specs.');
assert(Array.isArray(payload.eccn_candidates), 'Output is missing eccn_candidates.');
assert(typeof payload.memo_markdown === 'string', 'Output is missing memo_markdown.');
assert(payload.extracted_specs.length >= minSpecs, `Expected at least ${minSpecs} extracted facts, found ${payload.extracted_specs.length}.`);
assert(payload.eccn_candidates.length >= 2, `Expected at least 2 ECCN candidates, found ${payload.eccn_candidates.length}.`);
assert(!payloadText.includes('placeholder'), 'User-facing output still contains "placeholder".');
assert(!payloadText.includes('"mock"'), 'User-facing output still contains "mock".');
assert(!payloadText.includes('not extracted'), 'User-facing output still contains "not extracted".');
assert(!payloadText.includes('sample logic'), 'User-facing output still contains "sample logic".');
assert(payload.memo_markdown.includes('# Draft ECCN Review Memo'), 'Memo is missing the expected title heading.');
assert(!payload.memo_markdown.trim().startsWith('{'), 'Memo looks like raw JSON instead of Markdown.');
assert(payload.memo_markdown.includes('## 2. Extracted Technical Facts'), 'Memo is missing the extracted-facts section heading.');
assert(payload.memo_markdown.includes('## 3. Candidate ECCN Review Paths'), 'Memo is missing the candidate review paths section heading.');
assert(payload.memo_markdown.includes('### Product identity'), 'Memo is missing the product identity subsection.');
assert(payload.memo_markdown.includes('### Converter/performance specs'), 'Memo is missing the converter/performance subsection.');
assert(payload.memo_markdown.includes('### Digital interface/output specs'), 'Memo is missing the digital interface subsection.');
assert(payload.memo_markdown.includes('### RF/input-frequency specs'), 'Memo is missing the RF/input-frequency subsection.');
assert(payload.memo_markdown.includes('### Missing/not found facts'), 'Memo is missing the missing/not found subsection.');

const jesdSpecs = payload.extracted_specs.filter((spec) =>
  ['jesd_interface', 'jesd_other_references'].includes(spec.name),
);
const duplicateJESDEntries = payload.extracted_specs.filter((spec) =>
  spec.name === 'jesd_standard' || spec.value === 'JESD204',
);
assert(duplicateJESDEntries.length === 0, 'Output still includes unnormalized JESD facts.');
assert(
  jesdSpecs.filter((spec) => spec.name === 'jesd_interface').length <= 1,
  'Output still includes multiple primary JESD interface facts.',
);

for (const [index, spec] of payload.extracted_specs.entries()) {
  assert(typeof spec.name === 'string' && spec.name.length > 0, `Spec ${index} is missing name.`);
  assert(typeof spec.source_snippet === 'string' && spec.source_snippet.length > 0, `Spec ${index} is missing source_snippet.`);
  assert(typeof spec.importance === 'string' && spec.importance.length > 0, `Spec ${index} is missing importance.`);
  assert(typeof spec.category === 'string' && spec.category.length > 0, `Spec ${index} is missing category.`);
  assert(['high', 'medium', 'low'].includes(spec.confidence), `Spec ${index} has invalid confidence.`);
  if (spec.name === 'memory_type' && /human-body model|esd|jedec js-001|electrostatic discharge/i.test(spec.source_snippet)) {
    throw new Error('HBM memory extraction still points to Human Body Model / ESD context.');
  }
  if (spec.value === '1' && spec.unit === 'channels') {
    throw new Error('Output still includes "1 channels" style channel count formatting.');
  }
  if (spec.name === 'clock_speed' && /external clock|clock source|reference design|sysref/i.test(spec.source_snippet)) {
    throw new Error('External clocking guidance is still being labeled as device clock speed.');
  }
  if (spec.name === 'modulation_feature' && /pll is not locked/i.test(spec.source_snippet)) {
    throw new Error('PLL status text is still being labeled as a modulation feature.');
  }
  if (spec.name === 'converter_architecture' && /successive approximation|sar adc/i.test(spec.value) && /unlike|compared|versus|other adcs|traditional adcs|for example/i.test(spec.source_snippet)) {
    throw new Error('Comparative SAR text is still being extracted as device architecture.');
  }
}

const strongFactCount = payload.extracted_specs.filter((spec) => strongFactNames.has(spec.name)).length;
assert(strongFactCount >= 8, `Expected at least 8 strong ADC facts, found ${strongFactCount}.`);
assert(payload.memo_markdown.includes('This is a Category 3 electronics review path, not a final ECCN determination.'), 'Memo does not clearly frame 3A001 as a review path rather than a final ECCN.');
assert(/qualified reviewer/i.test(payload.memo_markdown), 'Memo should explicitly require qualified reviewer confirmation.');
assert(/This is application-context language from the datasheet, not a final end-use determination\./i.test(payload.memo_markdown), 'Memo is missing conservative application-context wording.');

for (const [index, candidate] of payload.eccn_candidates.entries()) {
  assert(Array.isArray(candidate.matched_technical_facts) && candidate.matched_technical_facts.length > 0, `Candidate ${index} is missing matched technical facts.`);
  assert(Array.isArray(candidate.regulatory_citations) && candidate.regulatory_citations.length > 0, `Candidate ${index} is missing regulatory citations.`);
  assert(Array.isArray(candidate.missing_information) && candidate.missing_information.length > 0, `Candidate ${index} is missing missing_information.`);
  assert(Array.isArray(candidate.uncertainty_flags) && candidate.uncertainty_flags.length > 0, `Candidate ${index} is missing uncertainty_flags.`);
  assert(Array.isArray(candidate.reviewer_questions) && candidate.reviewer_questions.length > 0, `Candidate ${index} is missing reviewer_questions.`);
  if (candidate.eccn === '3A001') {
    assert(/review path/i.test(candidate.why_it_may_apply), '3A001 reasoning is not framed as a review path.');
  }
}

const memoPath = payload.artifacts?.memo_path;
if (memoPath) {
  const resolvedMemoPath = path.resolve(memoPath);
  assert(fs.existsSync(resolvedMemoPath), `Memo artifact not found at ${resolvedMemoPath}.`);
}

console.log(
  JSON.stringify(
    {
      outputPath,
      extractedSpecCount: payload.extracted_specs.length,
      strongFactCount,
      candidateCount: payload.eccn_candidates.length,
      memoPath: payload.artifacts?.memo_path ?? null,
      status: 'ok',
    },
    null,
    2,
  ),
);
