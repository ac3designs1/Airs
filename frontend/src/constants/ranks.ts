export const RANKS = [
  'Recruit',
  'Probationary Constable',
  'Constable',
  'First Constable',
  'Senior Constable',
  'Leading Senior Constable',
  'Sergeant',
  'Senior Sergeant',
  'Inspector',
  'Superintendent',
  'Commander',
  'Assistant Commissioner',
  'Deputy Commissioner',
  'Commissioner',
] as const;

export type Rank = (typeof RANKS)[number];

export const RANK_DESCRIPTIONS: Record<string, string> = {
  'Recruit':                  'Supervised at all times',
  'Probationary Constable':   'FTO supervision — introductory phase',
  'Constable':                'Full officer — standard patrol duties',
  'First Constable':          'Experienced officer — increased field responsibility',
  'Senior Constable':         'Veteran officer — FTO eligible',
  'Leading Senior Constable': 'Team leader — field mentor',
  'Sergeant':                 'Supervisor — shift command',
  'Senior Sergeant':          'Senior supervisor — station management',
  'Inspector':                'Upper management — operational oversight',
  'Superintendent':           'Command staff — district/divisional commander',
  'Commander':                'Regional management — executive staff',
  'Assistant Commissioner':   'Executive command — major portfolio oversight',
  'Deputy Commissioner':      'Operational/corporate oversight — second-in-command',
  'Commissioner':             'Highest rank — chief of force operations',
};

export const DEFAULT_RANK: Rank = 'Recruit';
