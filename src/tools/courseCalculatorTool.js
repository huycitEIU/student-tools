import { getGradeFromScore } from './gradeData.js';

const createComponentRow = (index, name = '', weight = '') => {
  return `
    <div class="course-row" data-row="${index}">
      <input type="text" class="part-name" placeholder="Part name (Midterm, Final...)" value="${name}" />
      <input type="number" class="part-score" min="0" max="100" step="0.1" placeholder="Score" />
      <input type="number" class="part-weight" min="0" max="100" step="0.1" placeholder="Weight %" value="${weight}" />
      <button class="remove-row" type="button" aria-label="Remove part">Remove</button>
    </div>
  `;
};

export const courseCalculatorTool = {
  id: 'course-calculator',
  label: 'Grade Calculator',
  render: () => `
    <section class="card">
      <h2>Single Course Grade Calculator</h2>
      <p>Enter one course and its parts (midterm, final exam, etc). The part percentages must sum to 100%.</p>

      <div class="course-title-row">
        <input id="course-title" type="text" placeholder="Course name (example: Calculus I)" />
      </div>

      <div id="courses" class="courses">
        ${createComponentRow(1, 'Midterm', 40)}
        ${createComponentRow(2, 'Final Exam', 60)}
      </div>

      <div class="actions">
        <button id="add-course" class="action-btn" type="button">Add Part</button>
        <button id="calculate-gpa" class="action-btn primary" type="button">Calculate</button>
      </div>

      <div id="result" class="result" aria-live="polite">
        <p>Your course result will appear here.</p>
      </div>
    </section>
  `,
  mount: (root) => {
    const coursesWrap = root.querySelector('#courses');
    const addCourseBtn = root.querySelector('#add-course');
    const calculateGpaBtn = root.querySelector('#calculate-gpa');
    const resultWrap = root.querySelector('#result');
    const courseTitleInput = root.querySelector('#course-title');

    let partCounter = 2;

    addCourseBtn.addEventListener('click', () => {
      partCounter += 1;
      coursesWrap.insertAdjacentHTML('beforeend', createComponentRow(partCounter));
    });

    coursesWrap.addEventListener('click', (event) => {
      if (!event.target.classList.contains('remove-row')) {
        return;
      }

      const row = event.target.closest('.course-row');
      if (row && coursesWrap.children.length > 1) {
        row.remove();
      }
    });

    calculateGpaBtn.addEventListener('click', () => {
      const rows = Array.from(root.querySelectorAll('.course-row'));
      let weightedScore = 0;
      let weightSum = 0;
      const lines = [];
      const courseTitle = courseTitleInput.value.trim() || 'This course';

      rows.forEach((row, index) => {
        const nameInput = row.querySelector('.part-name');
        const scoreInput = row.querySelector('.part-score');
        const weightInput = row.querySelector('.part-weight');

        const partName = nameInput.value.trim() || `Part ${index + 1}`;
        const score = Number(scoreInput.value);
        const weight = Number(weightInput.value);

        if (Number.isNaN(score) || score < 0 || score > 100 || Number.isNaN(weight) || weight <= 0) {
          return;
        }

        weightedScore += (score * weight) / 100;
        weightSum += weight;
        lines.push(`<li>${partName}: ${score.toFixed(1)} x ${weight.toFixed(1)}%</li>`);
      });

      if (weightSum === 0) {
        resultWrap.innerHTML = '<p>Please enter valid part score (0-100) and weight (> 0).</p>';
        return;
      }

      if (Math.abs(weightSum - 100) > 0.01) {
        resultWrap.innerHTML = `<p>Total percentage must be exactly 100%. Current total: <strong>${weightSum.toFixed(1)}%</strong>.</p>`;
        return;
      }

      const grade = getGradeFromScore(weightedScore);
      resultWrap.innerHTML = `
        <p><strong>${courseTitle}</strong></p>
        <p><strong>Final Score: ${weightedScore.toFixed(2)}</strong></p>
        <p>Letter: <strong>${grade.letter}</strong> | Point: <strong>${grade.point.toFixed(1)}</strong> | Status: <strong>${grade.status}</strong></p>
        <ul>${lines.join('')}</ul>
      `;
    });
  }
};