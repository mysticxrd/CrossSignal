// The request layout Nebius's prefix cache needs (section 9 decision 4): system prompt, tools, trigger record, then
// messages that are only ever appended. Anything that changes per turn (calls_left, as_of, nudges) must travel in
// the newest message, so every earlier byte is identical to the previous send and can be read from the cache.
export function e1Request({ card, system, tools, trigger, history, outputCap = 8192, toolChoice = 'required' }) {
  return {
    model: card.model, temperature: 1, reasoning_effort: 'low', max_completion_tokens: outputCap,
    stream: false, n: 1, store: false, tool_choice: toolChoice, tools,
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(trigger) }, ...history],
  };
}

// What the model reads, in the order it reads it: the tools, then each message. Sampling settings and tool_choice
// are left out because they are not prompt tokens.
export function promptText(body) {
  return `${[JSON.stringify(body.tools), ...body.messages.map(message => JSON.stringify(message))].join('\n')}\n`;
}

// True when the next send repeats the previous send's prompt byte for byte before adding to it.
export const extendsPrefix = (previous, next) => promptText(next).startsWith(promptText(previous));
