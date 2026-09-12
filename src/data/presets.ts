export interface FieldPreset {
  label: string;
  brand: string;
  model: string;
  question: string;
  badge: string;
  isRefusalTest?: boolean;
}

export const FIELD_PRESETS: FieldPreset[] = [
  {
    label: 'Carrier 59MN7A • Fault 33 & SW1 DIPs',
    brand: 'Carrier',
    model: '59MN7A',
    question:
      'Fault code 33 limit switch circuit trip: what is the test procedure, and what are SW1 switch positions for continuous fan airflow?',
    badge: 'Covered query',
  },
  {
    label: 'Trane XR14 • Defrost Test & 32°F Ohms',
    brand: 'Trane',
    model: 'XR14',
    question: 'How do I force test the defrost control board, and what is the 10k thermistor resistance reading at 32°F?',
    badge: 'Table lookup',
  },
  {
    label: 'Copeland ZP • High Discharge Temp (>225°F)',
    brand: 'Copeland',
    model: 'ZP-Scroll',
    question:
      'What causes the discharge line thermostat to trip at 225°F, and how do I verify motor winding ohms (C-S, C-R, S-R)?',
    badge: 'Compressor',
  },
  {
    label: 'Daikin VRV-IV • Error U4 (out of library)',
    brand: 'Daikin',
    model: 'VRV-IV',
    question: 'How do I resolve communication error code U4 between indoor and outdoor inverter boards?',
    badge: 'Refusal test',
    isRefusalTest: true,
  },
];
