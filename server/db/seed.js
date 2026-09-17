import crypto from 'node:crypto';

export const seedDefaultPrompts = (db) => {
  const defaultPrompts = [
    {
      title: 'Ask AI / Draft Note',
      event_type: 'generation',
      system_prompt: 'You are an intelligent note-taking assistant. Answer directly, concisely, with well-structured Markdown.',
      user_prompt_template: '{{input}}',
      is_favorite: 1
    },
    {
      title: 'Brainstorm Ideas',
      event_type: 'generation',
      system_prompt: 'You are a creative thought partner. Brainstorm clear, structured, and actionable ideas in Markdown.',
      user_prompt_template: 'Brainstorm 5 creative ideas, perspectives, or angles on the following topic:\n\n{{input}}',
      is_favorite: 1
    },
    {
      title: 'Outline Document',
      event_type: 'generation',
      system_prompt: 'You are an expert technical writer. Produce hierarchical, well-organized outlines.',
      user_prompt_template: 'Create a structured hierarchical outline for:\n\n{{input}}',
      is_favorite: 0
    },
    {
      title: 'Summarize Key Takeaways',
      event_type: 'selection',
      system_prompt: 'You are an executive summarizer. Be extremely succinct and accurate. Format as bullet points with bold key terms.',
      user_prompt_template: 'Summarize this passage clearly into 3 key takeaways:\n\n"{{input}}"',
      is_favorite: 1
    },
    {
      title: 'Fix Grammar & Polish',
      event_type: 'selection',
      system_prompt: 'You are an editor. Improve clarity, fix grammar, and elevate prose while preserving the original intent and voice.',
      user_prompt_template: 'Fix all grammar, improve flow, and make this text clean and professional:\n\n"{{input}}"',
      is_favorite: 1
    },
    {
      title: 'Extract Action Items',
      event_type: 'selection',
      system_prompt: 'You are a project manager. Extract explicit and implicit action items into markdown checklists.',
      user_prompt_template: 'Extract all action items, tasks, and follow-ups from this text as markdown checklist items ([ ]):\n\n"{{input}}"',
      is_favorite: 1
    },
    {
      title: 'Explain Simply (ELI5)',
      event_type: 'selection',
      system_prompt: 'You explain complex topics using simple language, clear analogies, and minimal jargon.',
      user_prompt_template: 'Explain the core idea of this text simply as if to a beginner:\n\n"{{input}}"',
      is_favorite: 0
    },
    {
      title: 'Convert to JSON Schema / Data',
      event_type: 'selection',
      system_prompt: 'You are a data engineer. Extract structured information into clean, valid JSON format only.',
      user_prompt_template: 'Convert the following text or list into structured JSON:\n\n"{{input}}"',
      is_favorite: 0
    }
  ];

  const checkStmt = db.prepare('SELECT COUNT(*) as count FROM ai_prompts WHERE user_id IS NULL');
  const { count } = checkStmt.get();
  if (count === 0) {
    const insertStmt = db.prepare(`
      INSERT INTO ai_prompts (id, user_id, title, event_type, system_prompt, user_prompt_template, is_favorite, created_at)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((prompts) => {
      for (const p of prompts) {
        insertStmt.run(crypto.randomUUID(), p.title, p.event_type, p.system_prompt, p.user_prompt_template, p.is_favorite, Date.now());
      }
    });

    insertMany(defaultPrompts);
    console.log(`[DB] Seeded ${defaultPrompts.length} default AI prompts.`);
  }
};
