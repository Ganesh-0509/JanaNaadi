import { MCD_WARDS } from '../data/mcdWards';

export const MCD_ZONES = [
  'Narela',
  'Civil Lines',
  'Rohini',
  'Keshavpuram',
  'City-SP',
  'Karol Bagh',
  'West',
  'Najafgarh',
  'Central',
  'South',
  'Shahdara North',
  'Shahdara South',
] as const;

export type MCDZone = (typeof MCD_ZONES)[number];

export type WardResolutionLevel = 'ward' | 'zone' | 'global';

export type WardResolution = {
  level: WardResolutionLevel;
  wardId: number | null;
  label: string;
  zone: MCDZone | 'MCD Strategic Center';
  stateCode: string;
};

type EntityInput = {
  wardId?: number | null;
  ward?: string | null;
  state?: string | null;
  text?: string | null;
};

const ZONE_CODES: Record<MCDZone, string> = {
  'Narela': 'NAR',
  'Civil Lines': 'CVL',
  'Rohini': 'ROH',
  'Keshavpuram': 'KPV',
  'City-SP': 'CSP',
  'Karol Bagh': 'KBG',
  'West': 'WST',
  'Najafgarh': 'NJF',
  'Central': 'CNT',
  'South': 'STH',
  'Shahdara North': 'SHN',
  'Shahdara South': 'SHS',
};

const ZONE_KEYWORDS: Record<MCDZone, string[]> = {
  'Narela': ['narela', 'alipur', 'bakhtawarpur', 'holambi', 'bawana'],
  'Civil Lines': ['civil lines', 'timarpur', 'burari', 'adarsh nagar', 'model town', 'wazirpur'],
  'Rohini': ['rohini', 'rithala', 'mangol', 'shalimar', 'shakur basti'],
  'Keshavpuram': ['keshavpuram', 'keshav puram', 'pitampura', 'tri nagar', 'ashok vihar', 'saraswati vihar'],
  'City-SP': ['city-sp', 'city sp', 'chandni chowk', 'jama masjid', 'matia mahal', 'daryaganj', 'ballimaran'],
  'Karol Bagh': ['karol bagh', 'patel nagar', 'moti nagar', 'naraina', 'rajouri garden'],
  'West': ['west delhi', 'hari nagar', 'tilak nagar', 'janakpuri', 'vikaspuri', 'uttam nagar', 'dwarka'],
  'Najafgarh': ['najafgarh', 'matiala', 'palam', 'bijwasan', 'chhawla', 'kakrola', 'kapashera'],
  'Central': ['central delhi', 'new delhi', 'connaught', 'cp', 'rajinder nagar'],
  'South': ['south delhi', 'south east', 'okhla', 'kalkaji', 'mehrauli', 'malviya nagar', 'chhatarpur', 'badarpur', 'madanpur khadar'],
  'Shahdara North': ['shahdara north', 'seelampur', 'mustafabad', 'karawal nagar', 'gokalpur', 'ghonda', 'yamuna vihar'],
  'Shahdara South': ['shahdara south', 'krishna nagar', 'gandhi nagar', 'vishwas nagar', 'laxmi nagar', 'patparganj', 'trilokpuri'],
};

const CITY_WIDE_KEYWORDS = [
  'delhi budget',
  'city-wide',
  'citywide',
  'all delhi',
  'across delhi',
  'mcd budget',
  'mcd standing committee',
  'municipal policy',
];

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/ward\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function zoneCode(zone: MCDZone): string {
  return `Z-${ZONE_CODES[zone]}`;
}

function inferZoneFromAssembly(acName: string): MCDZone {
  const ac = normalize(acName);

  if (/(narela|alipur|bawana)/.test(ac)) return 'Narela';
  if (/(burari|timarpur|adarsh|model town|wazirpur)/.test(ac)) return 'Civil Lines';
  if (/(rohini|rithala|shalimar|mangol|shakur)/.test(ac)) return 'Rohini';
  if (/(tri nagar|keshav|pitampura)/.test(ac)) return 'Keshavpuram';
  if (/(chandni|matia|ballimaran|sadar bazar)/.test(ac)) return 'City-SP';
  if (/(karol|patel|moti|rajouri|naraina)/.test(ac)) return 'Karol Bagh';
  if (/(hari nagar|tilak nagar|vikaspuri|uttam nagar)/.test(ac)) return 'West';
  if (/(najafgarh|dwarka|matiala|palam|bijwasan)/.test(ac)) return 'Najafgarh';
  if (/(new delhi|kasturba|rajinder)/.test(ac)) return 'Central';
  if (/(okhla|kalkaji|mehrauli|malviya|chhatarpur|badarpur|deoli|sangam)/.test(ac)) return 'South';
  if (/(seelampur|gokalpur|mustafabad|karawal|babarpur|ghonda)/.test(ac)) return 'Shahdara North';
  if (/(trilokpuri|kondli|patparganj|laxmi nagar|krishna nagar|vishwas nagar|gandhi nagar)/.test(ac)) return 'Shahdara South';

  return 'Central';
}

const WARD_BY_ID = new Map(MCD_WARDS.map((ward) => [ward.id, ward]));
const WARD_BY_ALIAS = new Map<string, (typeof MCD_WARDS)[number]>();
const ZONE_BY_WARD_ID = new Map<number, MCDZone>();

for (const ward of MCD_WARDS) {
  const aliases = [
    ward.name,
    ward.name.replace(/\s*\([^)]*\)/g, ''),
    `${ward.name} ward`,
  ];

  for (const alias of aliases) {
    WARD_BY_ALIAS.set(normalize(alias), ward);
  }

  ZONE_BY_WARD_ID.set(ward.id, inferZoneFromAssembly(ward.ac));
}

function detectZoneFromText(input: string): MCDZone | null {
  const normalized = normalize(input);
  if (!normalized) return null;

  for (const zone of MCD_ZONES) {
    if (normalized.includes(normalize(zone))) {
      return zone;
    }

    const keywords = ZONE_KEYWORDS[zone];
    if (keywords.some((keyword) => normalized.includes(normalize(keyword)))) {
      return zone;
    }
  }

  return null;
}

function isCityWide(input: string): boolean {
  const normalized = normalize(input);
  return CITY_WIDE_KEYWORDS.some((keyword) => normalized.includes(normalize(keyword)));
}

export function resolveMcdEntity(input: EntityInput): WardResolution {
  if (input.wardId && WARD_BY_ID.has(input.wardId)) {
    const ward = WARD_BY_ID.get(input.wardId)!;
    const zone = ZONE_BY_WARD_ID.get(ward.id) ?? 'Central';
    return {
      level: 'ward',
      wardId: ward.id,
      label: ward.name,
      zone,
      stateCode: `W${String(ward.id).padStart(3, '0')}`,
    };
  }

  const wardNormalized = normalize(input.ward ?? '');
  if (wardNormalized && WARD_BY_ALIAS.has(wardNormalized)) {
    const ward = WARD_BY_ALIAS.get(wardNormalized)!;
    const zone = ZONE_BY_WARD_ID.get(ward.id) ?? 'Central';
    return {
      level: 'ward',
      wardId: ward.id,
      label: ward.name,
      zone,
      stateCode: `W${String(ward.id).padStart(3, '0')}`,
    };
  }

  const combined = [input.ward ?? '', input.state ?? '', input.text ?? ''].join(' ');
  const zone = detectZoneFromText(combined);
  if (zone) {
    return {
      level: 'zone',
      wardId: null,
      label: `${zone} Zone`,
      zone,
      stateCode: zoneCode(zone),
    };
  }

  if (isCityWide(combined)) {
    return {
      level: 'global',
      wardId: null,
      label: 'MCD Strategic Center',
      zone: 'MCD Strategic Center',
      stateCode: 'HQ-INTEL',
    };
  }

  // Strict no-unknown policy: ambiguous data defaults to a zone bucket.
  return {
    level: 'zone',
    wardId: null,
    label: 'Central Zone',
    zone: 'Central',
    stateCode: zoneCode('Central'),
  };
}
