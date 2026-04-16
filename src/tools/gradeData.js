export const gradeScale = [
  { min: 90, max: 100, letter: 'A', point: 4.0, status: 'Pass' },
  { min: 85, max: 89.9, letter: 'A-', point: 3.7, status: 'Pass' },
  { min: 80, max: 84.9, letter: 'B+', point: 3.3, status: 'Pass' },
  { min: 75, max: 79.9, letter: 'B', point: 3.0, status: 'Pass' },
  { min: 70, max: 74.9, letter: 'B-', point: 2.7, status: 'Pass' },
  { min: 65, max: 69.9, letter: 'C+', point: 2.3, status: 'Pass' },
  { min: 60, max: 64.9, letter: 'C', point: 2.0, status: 'Pass' },
  { min: 55, max: 59.9, letter: 'C-', point: 1.7, status: 'Pass' },
  { min: 53, max: 54.9, letter: 'D+', point: 1.3, status: 'Pass' },
  { min: 52, max: 52.9, letter: 'D', point: 1.0, status: 'Pass' },
  { min: 50, max: 51.9, letter: 'D-', point: 0.7, status: 'Pass' },
  { min: 0, max: 49.9, letter: 'F', point: 0.0, status: 'Not Pass' }
];

export const getGradeFromScore = (score) => {
  return gradeScale.find((item) => score >= item.min && score <= item.max) || gradeScale[gradeScale.length - 1];
};