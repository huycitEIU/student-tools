import { gradeScale } from './gradeData.js';

export const gradeScaleTool = {
  id: 'grade-scale',
  label: 'Grade Scale',
  render: () => `
    <section class="card">
      <h2>Grade Scale</h2>
      <p>Reference table for score, letter grade, grade point, and pass status.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Score Range</th>
              <th>Letter</th>
              <th>Point</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${gradeScale
              .map(
                (item) => `
                  <tr>
                    <td>${item.min} - ${item.max}</td>
                    <td>${item.letter}</td>
                    <td>${item.point.toFixed(1)}</td>
                    <td>${item.status}</td>
                  </tr>
                `
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </section>
  `,
  mount: () => {}
};