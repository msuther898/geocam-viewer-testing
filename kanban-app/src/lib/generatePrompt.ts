import OpenAI from 'openai';

export async function generateClaudePrompt(taskTitle: string, taskDescription: string, apiKey: string): Promise<string> {
  const openai = new OpenAI({
    apiKey: apiKey,
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `You are an expert at creating detailed, actionable prompts for AI coding assistants like Claude Code.
Your job is to take a task title and optional description and generate a comprehensive prompt that a developer can give to Claude Code to implement the feature.

The prompt should:
1. Be clear and specific about what needs to be built
2. Include technical considerations and best practices
3. Suggest the general approach or architecture if appropriate
4. Mention edge cases to consider
5. Be formatted in a way that's easy to copy and paste

Keep the prompt concise but thorough - aim for actionable clarity.`;

  const userMessage = taskDescription
    ? `Task: ${taskTitle}\n\nDescription: ${taskDescription}`
    : `Task: ${taskTitle}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 1000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || 'Failed to generate prompt';
}
