import { FeedbackAnalysis, PracticeAttempt, PracticeSession, Scenario, Skill, SkillLibrary, User } from '../types';

interface LearningRecordPdfInput {
  currentUser: User;
  session: PracticeSession;
  scenario: Scenario;
  skills: Skill[];
  completedAttempts: PracticeAttempt[];
  feedback: FeedbackAnalysis | null;
  appLibrary: SkillLibrary | null;
  reference: string;
  filename: string;
}

const plainText = (value: unknown) => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201c\u201d]/g, '"')
  .replace(/[\u2022]/g, '-')
  .replace(/[^\x09\x0A\x0D\x20-\x7E\xA3]/g, '');

const formatPdfDate = (value?: string) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date unavailable';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
};

const titleCase = (value?: string) => value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : 'Not recorded';

export const createLearningRecordPdfBlob = async ({
  currentUser,
  session,
  scenario,
  skills,
  completedAttempts,
  feedback,
  appLibrary,
  reference,
  filename,
}: LearningRecordPdfInput) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);
  const pageBottom = pageHeight - 20;
  let y = margin;

  const colours = {
    ink: [17, 24, 39] as [number, number, number],
    grey: [107, 114, 128] as [number, number, number],
    lightGrey: [243, 244, 246] as [number, number, number],
    border: [209, 213, 219] as [number, number, number],
    indigo: [79, 70, 229] as [number, number, number],
    indigoLight: [238, 242, 255] as [number, number, number],
    green: [4, 120, 87] as [number, number, number],
    amber: [180, 83, 9] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  const setText = (colour = colours.ink) => doc.setTextColor(...colour);
  const newPage = () => {
    doc.addPage();
    y = margin;
  };
  const ensureSpace = (height: number) => {
    if (y + height > pageBottom) newPage();
  };
  const linesFor = (text: unknown, width: number, size = 9) => {
    doc.setFontSize(size);
    return doc.splitTextToSize(plainText(text), width) as string[];
  };
  const writeLines = (lines: string[], x: number, startY: number, size = 9, colour = colours.grey, lineHeight = 1.38) => {
    doc.setFontSize(size);
    setText(colour);
    doc.text(lines, x, startY, { lineHeightFactor: lineHeight });
    return lines.length * size * 0.3528 * lineHeight;
  };
  const sectionHeading = (label: string, heading: string) => {
    ensureSpace(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(colours.indigo);
    doc.text(plainText(label).toUpperCase(), margin, y);
    y += 6;
    doc.setFontSize(18);
    setText(colours.ink);
    doc.text(plainText(heading), margin, y);
    y += 9;
  };
  const field = (label: string, text: unknown, options?: { fill?: [number, number, number]; colour?: [number, number, number] }) => {
    const lines = linesFor(text || 'Not available', contentWidth - 10, 8.5);
    const height = 12 + (lines.length * 4.2);
    ensureSpace(height + 3);
    doc.setFillColor(...(options?.fill || colours.lightGrey));
    doc.roundedRect(margin, y, contentWidth, height, 2.5, 2.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(options?.colour || colours.grey);
    doc.text(plainText(label).toUpperCase(), margin + 5, y + 6);
    doc.setFont('helvetica', 'normal');
    writeLines(lines, margin + 5, y + 11, 8.5, options?.colour || colours.ink);
    y += height + 3;
  };

  const microSkillDetails = new Map<string, { label: string; skill: string; group: string }>();
  appLibrary?.skill_groups.forEach(group => {
    group.skills.forEach(skill => {
      skill.micro_skills.forEach(microSkill => {
        microSkillDetails.set(microSkill.id, { label: microSkill.label, skill: skill.label, group: group.label });
      });
    });
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  setText(colours.indigo);
  doc.text('SKILL BUILDER LEARNING RECORD', margin, y);
  y += 8;
  doc.setFontSize(27);
  setText(colours.ink);
  const titleLines = linesFor(scenario.title, contentWidth, 27);
  doc.text(titleLines, margin, y, { lineHeightFactor: 1.05 });
  y += (titleLines.length * 10) + 2;
  doc.setFont('helvetica', 'normal');
  const introLines = linesFor('Evidence of a formative scenario assessment and its associated micro-skill practice.', contentWidth, 9.5);
  y += writeLines(introLines, margin, y, 9.5, colours.grey) + 7;
  doc.setDrawColor(...colours.ink);
  doc.setLineWidth(0.7);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const metaWidth = contentWidth / 3;
  const metadata = [
    ['Learner', currentUser.email],
    ['Assessment date', formatPdfDate(session.timestamp)],
    ['Record reference', reference],
  ];
  doc.setFillColor(...colours.lightGrey);
  doc.roundedRect(margin, y, contentWidth, 23, 3, 3, 'F');
  metadata.forEach(([label, value], index) => {
    const x = margin + (index * metaWidth) + 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(colours.grey);
    doc.text(label.toUpperCase(), x, y + 7);
    doc.setFontSize(index === 0 ? 8 : 9);
    setText(colours.ink);
    const valueLines = linesFor(value, metaWidth - 10, index === 0 ? 8 : 9);
    doc.text(valueLines.slice(0, 2), x, y + 14, { lineHeightFactor: 1.15 });
  });
  y += 32;

  sectionHeading('Completion summary', 'Work completed');
  const validAssessment = feedback?.validity?.is_valid === true;
  const summaryBoxes = [
    {
      label: 'Scenario assessment',
      value: validAssessment ? 'Completed' : 'Needs more evidence',
      detail: validAssessment ? 'The assessment produced a valid formative rubric.' : feedback?.validity?.reason || 'A valid rubric was not available.',
      colour: validAssessment ? colours.green : colours.amber,
    },
    {
      label: 'Completed micro-practices',
      value: `${completedAttempts.length} completed`,
      detail: 'Every completed practice session is included, including repeated work on the same micro-skill.',
      colour: colours.indigo,
    },
  ];
  const boxGap = 6;
  const boxWidth = (contentWidth - boxGap) / 2;
  const boxDetails = summaryBoxes.map(item => linesFor(item.detail, boxWidth - 10, 7.8));
  const boxHeight = Math.max(...boxDetails.map(lines => 22 + (lines.length * 3.7)));
  summaryBoxes.forEach((item, index) => {
    const x = margin + (index * (boxWidth + boxGap));
    doc.setDrawColor(...colours.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText(colours.grey);
    doc.text(item.label.toUpperCase(), x + 5, y + 7);
    doc.setFontSize(14);
    setText(item.colour);
    doc.text(item.value, x + 5, y + 15);
    doc.setFont('helvetica', 'normal');
    writeLines(boxDetails[index], x + 5, y + 21, 7.8, colours.grey);
  });
  y += boxHeight + 12;

  sectionHeading('Formative assessment', 'Rubric feedback');
  doc.setFillColor(...colours.indigoLight);
  doc.roundedRect(margin, y, contentWidth, 11, 2.5, 2.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  setText(colours.indigo);
  doc.text('These results are formative Skill Builder feedback. They are not an academic grade.', margin + 5, y + 7);
  y += 17;

  if (feedback) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    setText(colours.ink);
    doc.text(`${feedback.total_score}/25`, margin, y);
    doc.setFontSize(10);
    setText(colours.grey);
    doc.text(plainText(feedback.leadership_potential), margin + 28, y);
    y += 8;

    const scoreItems = Object.entries(feedback.scores).map(([id, value]) => ({
      name: skills.find(skill => skill.id === id)?.name || id.replace(/_/g, ' '),
      score: value.score,
      justification: value.justification,
    }));
    const scoreGap = 5;
    const scoreWidth = (contentWidth - scoreGap) / 2;
    for (let index = 0; index < scoreItems.length; index += 2) {
      const row = scoreItems.slice(index, index + 2);
      const rowLines = row.map(item => linesFor(item.justification, scoreWidth - 10, 7.6));
      const rowHeight = Math.max(...rowLines.map(lines => 19 + (lines.length * 3.7)));
      if (index === 4 || y + rowHeight + 5 > pageBottom) {
        newPage();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        setText(colours.indigo);
        doc.text('FORMATIVE ASSESSMENT', margin, y);
        y += 6;
        doc.setFontSize(14);
        setText(colours.ink);
        doc.text('Rubric feedback continued', margin, y);
        y += 9;
      }
      row.forEach((item, column) => {
        const x = margin + (column * (scoreWidth + scoreGap));
        doc.setDrawColor(...colours.border);
        doc.roundedRect(x, y, scoreWidth, rowHeight, 2.5, 2.5, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        setText(colours.ink);
        doc.text(plainText(item.name).toUpperCase(), x + 5, y + 7);
        doc.setFontSize(12);
        doc.text(`${item.score}/5`, x + scoreWidth - 5, y + 7, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        writeLines(rowLines[column], x + 5, y + 14, 7.6, colours.grey);
      });
      y += rowHeight + 5;
    }

    const overallLines = linesFor(feedback.summary.overall_summary, contentWidth - 12, 8.3);
    const strengths = feedback.summary.strengths.map(item => `- ${plainText(item)}`);
    const improvements = feedback.summary.areas_for_improvement.map(item => `- ${plainText(item)}`);
    const summaryHeight = 26 + (overallLines.length * 4.1) + ((strengths.length + improvements.length) * 4.5) + 14;
    ensureSpace(summaryHeight + 5);
    doc.setFillColor(...colours.ink);
    doc.roundedRect(margin, y, contentWidth, summaryHeight, 3, 3, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText([156, 163, 175]);
    doc.text('OVERALL SUMMARY', margin + 6, y + 7);
    doc.setFont('helvetica', 'normal');
    const overallHeight = writeLines(overallLines, margin + 6, y + 13, 8.3, colours.white);
    let summaryY = y + 17 + overallHeight;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText([52, 211, 153]);
    doc.text('STRENGTHS', margin + 6, summaryY);
    summaryY += 5;
    doc.setFont('helvetica', 'normal');
    strengths.forEach(item => {
      const lines = linesFor(item, contentWidth - 12, 7.6);
      summaryY += writeLines(lines, margin + 6, summaryY, 7.6, colours.white) + 1;
    });
    summaryY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    setText([252, 211, 77]);
    doc.text('AREAS TO DEVELOP', margin + 6, summaryY);
    summaryY += 5;
    doc.setFont('helvetica', 'normal');
    improvements.forEach(item => {
      const lines = linesFor(item, contentWidth - 12, 7.6);
      summaryY += writeLines(lines, margin + 6, summaryY, 7.6, colours.white) + 1;
    });
    y += summaryHeight + 8;
  } else {
    field('Rubric feedback', 'Rubric feedback is unavailable for this historical session.', { fill: [255, 247, 237], colour: colours.amber });
  }

  newPage();
  sectionHeading('Associated practice', 'Micro-practice feedback');
  doc.setFont('helvetica', 'normal');
  const practiceIntro = linesFor('Completed practice attempts linked to this scenario assessment. Conversation transcripts are intentionally excluded.', contentWidth, 9);
  y += writeLines(practiceIntro, margin, y, 9, colours.grey) + 7;

  if (completedAttempts.length === 0) {
    field('Practice record', 'No completed micro-practices are linked to this scenario yet.');
  } else {
    completedAttempts.forEach((attempt, index) => {
      const details = microSkillDetails.get(attempt.microSkillId);
      const reflection = attempt.reflection;
      ensureSpace(31);
      doc.setDrawColor(...colours.border);
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 7;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      setText(colours.indigo);
      doc.text(`PRACTICE ${index + 1}`, margin, y);
      y += 6;
      doc.setFontSize(14);
      setText(colours.ink);
      const skillLines = linesFor(details?.label || 'Micro-skill practice', contentWidth - 50, 14);
      doc.text(skillLines, margin, y, { lineHeightFactor: 1.1 });
      const titleHeight = skillLines.length * 5.4;
      doc.setFontSize(8);
      setText(colours.grey);
      doc.text(formatPdfDate(attempt.completedAt || attempt.timestamp), pageWidth - margin, y, { align: 'right' });
      doc.text(`${titleCase(attempt.interactionMedium)} conversation`, pageWidth - margin, y + 5, { align: 'right' });
      y += titleHeight + 2;
      doc.setFontSize(7.5);
      doc.text(plainText(details ? `${details.group} | ${details.skill}` : 'Skill details unavailable'), margin, y);
      y += 7;

      if (reflection) {
        field('Outcome', reflection.detected ? 'Micro-skill practised' : 'Keep practising', {
          fill: colours.lightGrey,
          colour: reflection.detected ? colours.green : colours.amber,
        });
        field('Evidence observed', reflection.evidence);
        field('Observed impact', reflection.impact);
        field('Coaching tip', reflection.adjustment, { fill: colours.indigoLight, colour: colours.indigo });
      } else {
        field('Practice feedback', 'This practice was completed, but reflection feedback is unavailable for the historical record.');
      }
      y += 3;
    });
  }

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...colours.border);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setText(colours.grey);
    doc.text(`SKILL BUILDER | ${plainText(reference)} | ${plainText(currentUser.email)}`, margin, pageHeight - 8);
    doc.text(`PAGE ${page} OF ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }

  doc.setProperties({ title: filename.replace(/\.pdf$/i, '') });
  return doc.output('blob');
};
