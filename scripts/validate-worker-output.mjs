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
const extractedTextPath = path.resolve(payload.artifacts?.extracted_text_path ?? '');
const extractedText = fs.existsSync(extractedTextPath)
  ? fs.readFileSync(extractedTextPath, 'utf8')
  : '';
const normalizedExtractedText = extractedText.toLowerCase().replace(/\s+/g, ' ');

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
const socStrongFactNames = new Set([
  'manufacturer',
  'product_family',
  'product_name',
  'document_number',
  'document_type',
  'part_number',
  'is_family_overview',
  'product_profile',
  'processor_architecture',
  'cpu_core',
  'cpu_core_count',
  'realtime_cpu',
  'programmable_logic',
  'processing_system',
  'ps_pl_integration',
  'ethernet_mac',
  'pcie_interface',
  'usb_interface',
  'can_interface',
  'spi_interface',
  'i2c_interface',
  'uart_interface',
  'jtag_interface',
  'displayport_interface',
  'displayport_lane_rate',
  'secure_boot',
  'cryptographic_algorithm',
  'crypto_key_size',
  'memory_integrity',
  'peripheral_adc',
]);

const staleMarkersByDevice = {
  ADC32RF45: [
    'ADC12DJ5200RF',
    '12-bit',
    '10.4 GSPS',
    '5.2 GSPS',
    '8 GHz',
    '> 10 GHz',
    'JESD204C',
    '17.16 Gbps',
  ],
  ADC12DJ5200RF: [
    'ADC32RF45',
    '14-bit',
    '3.0 GSPS',
    'JESD204B',
    '12.5 Gbps',
    'VQFN',
    '3.2 W/Ch',
  ],
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsText(haystack, needle) {
  return normalize(haystack).includes(normalize(needle));
}

function extractedFactString(spec) {
  return normalize(
    `${displayName(spec.name)}: ${spec.value}${spec.unit ? ` ${spec.unit}` : ''}`,
  );
}

function displayName(name) {
  const mapping = {
    manufacturer: 'Manufacturer',
    part_number: 'Part Number',
    product_family: 'Product Family',
    product_name: 'Product Name',
    document_number: 'Document Number',
    document_type: 'Document Type',
    is_family_overview: 'Family Overview',
    product_profile: 'Detected Product Profile',
    processor_architecture: 'Processor Architecture',
    cpu_core: 'CPU Core',
    cpu_core_count: 'Core Count',
    realtime_cpu: 'Real-Time CPU',
    programmable_logic: 'Programmable Logic',
    processing_system: 'Processing System',
    ps_pl_integration: 'PS/PL Integration',
    ethernet_mac: 'Ethernet MACs',
    pcie_interface: 'PCIe Interface',
    usb_interface: 'USB Interface',
    can_interface: 'CAN Interface',
    spi_interface: 'SPI Interface',
    i2c_interface: 'I2C Interface',
    uart_interface: 'UART Interface',
    jtag_interface: 'JTAG Interface',
    displayport_interface: 'DisplayPort Interface',
    displayport_lane_rate: 'DisplayPort Lane Rate',
    secure_boot: 'Secure/Non-Secure Boot',
    cryptographic_algorithm: 'Cryptographic Algorithm',
    crypto_key_size: 'Key Size',
    memory_integrity: 'Memory/Cache Integrity',
    peripheral_adc: 'Peripheral ADC',
    device_type: 'Device Type',
    adc_resolution: 'ADC Resolution',
    sample_rate: 'Sample Rate',
    single_channel_sample_rate: 'Single-Channel Sample Rate',
    dual_channel_sample_rate: 'Dual-Channel Sample Rate',
    channel_modes: 'Channel Modes',
    input_bandwidth: 'Analog Input Bandwidth',
    usable_input_frequency_range: 'Usable Input Frequency Range',
    jesd_interface: 'JESD Interface',
    jesd_other_references: 'Other JESD References Found',
    serial_lane_rate: 'Serial Lane Rate',
    interface_lane_count: 'Lane Count',
    application_examples: 'Application Examples',
    package_type: 'Package',
    power_consumption: 'Power Consumption',
  };

  return mapping[name] ?? name.replace(/_/g, ' ');
}

function extractQuestionTokens(question) {
  const matches = [
    ...question.matchAll(/\bJESD204[A-Z]?\b/gi),
    ...question.matchAll(/(?:up to|greater than|less than|>|<)?\s*\d+(?:\.\d+)?\s*(?:GSPS|MSPS|KSPS|Gbps|GHz|MHz|bits?|lanes?)/gi),
  ];
  return matches.map((match) => match[0].trim());
}

assert(Array.isArray(payload.extracted_specs), 'Output is missing extracted_specs.');
assert(Array.isArray(payload.eccn_candidates), 'Output is missing eccn_candidates.');
assert(typeof payload.memo_markdown === 'string', 'Output is missing memo_markdown.');
assert(
  payload.extracted_specs.length >= minSpecs,
  `Expected at least ${minSpecs} extracted facts, found ${payload.extracted_specs.length}.`,
);
assert(
  payload.eccn_candidates.length >= 2,
  `Expected at least 2 ECCN candidates, found ${payload.eccn_candidates.length}.`,
);
assert(!payloadText.includes('placeholder'), 'User-facing output still contains "placeholder".');
assert(!payloadText.includes('"mock"'), 'User-facing output still contains "mock".');
assert(!payloadText.includes('not extracted'), 'User-facing output still contains "not extracted".');
assert(!payloadText.includes('sample logic'), 'User-facing output still contains "sample logic".');
assert(payload.memo_markdown.includes('# Draft ECCN Review Memo'), 'Memo is missing the expected title heading.');
assert(!payload.memo_markdown.trim().startsWith('{'), 'Memo looks like raw JSON instead of Markdown.');
assert(payload.memo_markdown.includes('## 2. Extracted Technical Facts'), 'Memo is missing the extracted-facts section heading.');
assert(payload.memo_markdown.includes('## 3. Recommended Review Paths'), 'Memo is missing the recommended review paths section heading.');
assert(payload.memo_markdown.includes('Draft for expert review only'), 'Memo is missing the draft-only disclaimer.');

const extractedFacts = new Set(payload.extracted_specs.map(extractedFactString));
const isZynqSoc =
  normalizedExtractedText.includes('zynq ultrascale+ mpsoc') ||
  payload.extracted_specs.some(
    (spec) => spec.name === 'product_family' && normalize(spec.value).includes('zynq ultrascale+ mpsoc'),
  );
const relevantStrongFactNames = isZynqSoc ? socStrongFactNames : strongFactNames;
const strongFactCount = payload.extracted_specs.filter((spec) => relevantStrongFactNames.has(spec.name)).length;
assert(
  strongFactCount >= 8,
  `Expected at least 8 strong ${isZynqSoc ? 'SoC' : 'ADC'} facts, found ${strongFactCount}.`,
);

const partNumber = payload.extracted_specs.find((spec) => spec.name === 'part_number')?.value;
const documentTitle = payload.memo_markdown.split('\n')[0].replace('# Draft ECCN Review Memo — ', '').trim();
const currentDevice = [partNumber, documentTitle].find((value) => value && staleMarkersByDevice[value]);
if (currentDevice) {
  for (const marker of staleMarkersByDevice[currentDevice]) {
    if (containsText(payload.memo_markdown, marker) && !containsText(extractedText, marker)) {
      throw new Error(`Memo contains stale cross-document marker "${marker}" for ${currentDevice}.`);
    }
  }
}

if (isZynqSoc) {
  const specValues = (name) =>
    payload.extracted_specs.filter((spec) => spec.name === name).map((spec) => normalize(spec.value));
  const productFamilies = specValues('product_family');
  const documentNumbers = specValues('document_number');
  const partNumbers = specValues('part_number');
  const profiles = specValues('product_profile');
  const deviceTypes = specValues('device_type');
  const candidateText = normalize(
    payload.eccn_candidates.map((candidate) => `${candidate.eccn} ${candidate.title}`).join(' '),
  );
  const reviewerQuestionText = normalize(
    payload.eccn_candidates
      .flatMap((candidate) => candidate.reviewer_questions)
      .join(' '),
  );

  assert(
    productFamilies.includes('zynq ultrascale+ mpsoc'),
    'Zynq/SoC output is missing productFamily: Zynq UltraScale+ MPSoC.',
  );
  assert(
    documentNumbers.includes('ds891'),
    'Zynq/SoC output is missing documentNumber: DS891.',
  );
  assert(
    !partNumbers.includes('ds891'),
    'Zynq/SoC output still treats DS891 as the part number.',
  );
  assert(
    partNumbers.some((value) => value.includes('not a single part number')),
    'Zynq/SoC output does not identify the part number as a family overview.',
  );
  assert(
    !deviceTypes.includes('adc'),
    'Zynq/SoC output still classifies the primary device type as ADC.',
  );
  assert(
    !profiles.includes('adc_dac_converter'),
    'Zynq/SoC output still uses adc_dac_converter profile.',
  );
  assert(
    profiles.some((value) => ['fpga_programmable_logic_soc', 'mcu_processor_soc'].includes(value)),
    'Zynq/SoC output is missing a SoC/programmable-logic profile.',
  );
  assert(
    !normalize(payload.memo_markdown).includes('high-speed adc'),
    'Zynq/SoC memo still contains high-speed ADC candidate language.',
  );
  assert(
    candidateText.includes('category 3') && candidateText.includes('soc'),
    'Zynq/SoC output is missing a Category 3 electronics / SoC review path.',
  );
  assert(
    candidateText.includes('category 5 part 2'),
    'Zynq/SoC output is missing a Category 5 Part 2 review path despite security facts.',
  );
  assert(
    candidateText.includes('3a991') && /fallback|comparison/i.test(candidateText),
    'Zynq/SoC output should include 3A991 only as a fallback/comparison path.',
  );
  assert(
    reviewerQuestionText.includes('programmable') && reviewerQuestionText.includes('category 5 part 2'),
    'Zynq/SoC reviewer questions are not profile-specific enough.',
  );
}

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
  if (spec.name === 'adc_resolution' && /cortex|quad-core|dual-core|aes-gcm|external inputs|system monitor/i.test(spec.source_snippet)) {
    throw new Error('ADC resolution was extracted from SoC CPU, crypto, or subordinate peripheral context.');
  }
  if (spec.name === 'cryptographic_algorithm' && spec.value.toUpperCase() === 'ECC' && /cache|tcm|ram|memory|axi|coherency/i.test(spec.source_snippet)) {
    throw new Error('ECC memory/cache context is still being treated as cryptographic ECC.');
  }
  if (spec.name === 'seu_or_sel') {
    assert(
      /single event|single-event|radiation|tid|heavy ion|space/i.test(spec.source_snippet),
      'SEL/SEU extraction still lacks strong radiation context.',
    );
  }
}

assert(!/\bSEL\b/.test(payload.memo_markdown) || /single event|single-event|radiation|tid|heavy ion|space/i.test(payload.memo_markdown), 'Memo still treats SEL as radiation evidence without radiation context.');
assert(!payload.memo_markdown.includes('1 channels'), 'Memo still includes malformed "1 channels" wording.');

for (const [index, candidate] of payload.eccn_candidates.entries()) {
  assert(Array.isArray(candidate.matched_technical_facts) && candidate.matched_technical_facts.length > 0, `Candidate ${index} is missing matched technical facts.`);
  assert(Array.isArray(candidate.regulatory_citations) && candidate.regulatory_citations.length > 0, `Candidate ${index} is missing regulatory citations.`);
  assert(Array.isArray(candidate.missing_information) && candidate.missing_information.length > 0, `Candidate ${index} is missing missing_information.`);
  assert(Array.isArray(candidate.uncertainty_flags) && candidate.uncertainty_flags.length > 0, `Candidate ${index} is missing uncertainty_flags.`);
  assert(Array.isArray(candidate.reviewer_questions) && candidate.reviewer_questions.length > 0, `Candidate ${index} is missing reviewer_questions.`);
  assert(/qualified reviewer/i.test(candidate.why_it_may_apply) || candidate.eccn !== '3A001', '3A001 reasoning should explicitly require qualified reviewer confirmation.');

  for (const fact of candidate.matched_technical_facts) {
    if (!extractedFacts.has(normalize(fact)) && !/require category 3 review|no strong controlled indicators/i.test(fact)) {
      throw new Error(`Candidate ${index} contains unmatched technical fact "${fact}".`);
    }
  }

  for (const citation of candidate.regulatory_citations) {
    if (/datasheet evidence/i.test(citation.citation_label)) {
      assert(
        containsText(extractedText, citation.citation_text),
        `Candidate ${index} citation is not grounded in current extracted text: "${citation.citation_text}".`,
      );
      assert(
        /uploaded datasheet text|bundled sample datasheet text|current document text/i.test(citation.source),
        `Candidate ${index} citation source is too generic: "${citation.source}".`,
      );
    }
  }

  for (const question of candidate.reviewer_questions) {
    for (const token of extractQuestionTokens(question)) {
      const normalizedToken = normalize(token);
      const tokenInFacts = [...extractedFacts].some((fact) => fact.includes(normalizedToken));
      if (!normalizedExtractedText.includes(normalizedToken) && !tokenInFacts) {
        throw new Error(`Candidate ${index} reviewer question uses token not found in current run: "${token}".`);
      }
    }
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
      extractedTextPath,
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
