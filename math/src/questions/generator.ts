import type { ModelMetadata, Question, SkillId } from "../dkt/types";

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickSkill(skills: string[]): { skillId: SkillId; skillName: string } {
  const skillId = randomInt(0, skills.length - 1) as SkillId;
  return { skillId, skillName: skills[skillId] };
}

function generateAddition(): { prompt: string; answer: number } {
  const a = randomInt(1, 20);
  const b = randomInt(1, 20);
  return { prompt: `${a} + ${b} = ?`, answer: a + b };
}

function generateSubtraction(): { prompt: string; answer: number } {
  const a = randomInt(1, 20);
  const b = randomInt(1, a);
  return { prompt: `${a} - ${b} = ?`, answer: a - b };
}

function generateMultiplication(): { prompt: string; answer: number } {
  const a = randomInt(1, 12);
  const b = randomInt(1, 12);
  return { prompt: `${a} × ${b} = ?`, answer: a * b };
}

export function generateQuestion(metadata: ModelMetadata): Question {
  const { skillId, skillName } = pickSkill(metadata.skills);

  let generated: { prompt: string; answer: number };
  switch (skillId) {
    case 0:
      generated = generateAddition();
      break;
    case 1:
      generated = generateSubtraction();
      break;
    case 2:
      generated = generateMultiplication();
      break;
    default:
      generated = generateAddition();
  }

  return {
    skillId,
    skillName,
    prompt: generated.prompt,
    answer: generated.answer,
  };
}
