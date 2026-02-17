export const inputs: Record<string, unknown>[] = [
  // 1. Valid minimal
  {
    first_name: 'Alice',
    last_name: 'Smith',
    gender: 'female',
    vaccinated: true,
    perks: ['coffee'],
  },

  // 2. Valid with multiple perks and comment
  {
    first_name: 'Bob',
    last_name: 'Johnson',
    gender: 'male',
    vaccinated: false,
    perks: ['snacks', 'wifi', 'gym'],
    comment: 'Prefers morning sessions',
  },

  // 3. Valid wondergender
  {
    first_name: 'Casey',
    last_name: 'Taylor',
    gender: 'female',
    vaccinated: true,
    perks: ['music', 'games'],
  },

  // 4. Invalid: first_name too long
  {
    first_name: 'A'.repeat(65),
    last_name: 'Brown',
    gender: 'male',
    vaccinated: true,
    perks: ['coffee'],
  },

  // 5. Invalid: gender not allowed - "female" is expected
  {
    first_name: 'Dana',
    last_name: 'White',
    gender: 'woman',
    vaccinated: true,
    perks: ['tea'],
  },

  // 6. Invalid: vaccinated wrong type
  {
    first_name: 'Evan',
    last_name: 'Davis',
    gender: 'nonbinary',
    vaccinated: 'yes',
    perks: ['snacks'],
  },

  // 7. Invalid: perk too long
  {
    first_name: 'Frank',
    last_name: 'Miller',
    gender: 'male',
    vaccinated: false,
    perks: ['thisperkistoolong'],
  },

  // 8. Valid with empty comment string
  {
    first_name: 'Grace',
    last_name: 'Wilson',
    gender: 'female',
    vaccinated: true,
    perks: ['wifi', 'desk'],
    comment: '',
  },

  // 9. Invalid: perks contains empty string
  {
    first_name: 'Hannah',
    last_name: 'Moore',
    gender: 'female',
    vaccinated: true,
    perks: [''],
  },

  // 10. Invalid: missing required field last_name
  {
    first_name: 'Ian',
    gender: 'male',
    vaccinated: true,
    perks: ['coffee'],
  },
]
