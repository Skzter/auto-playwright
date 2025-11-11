import OpenAI from "openai";
import { type Page, TaskMessage, TaskResult } from "./types";
import { prompt, SYSTEM_PROMPT } from "./prompt";
import { createActions } from "./createActions";

const defaultDebug = process.env.AUTO_PLAYWRIGHT_DEBUG === "true";

export const completeTask = async (
  page: Page,
  task: TaskMessage,
): Promise<TaskResult> => {
  const openai = new OpenAI({
    apiKey: task.options?.openaiApiKey ?? process.env.OPENAI_API_KEY,
    baseURL: task.options?.openaiBaseUrl,
    defaultQuery: task.options?.openaiDefaultQuery,
    defaultHeaders: task.options?.openaiDefaultHeaders,
  });

  let lastFunctionResult: TaskResult | null = null;

  const actions = createActions(page);
  const debug = task.options?.debug ?? defaultDebug;

  // Convert actions to OpenAI tools format
  const tools = Object.values(actions).map((action) => ({
    type: "function" as const,
    function: {
      name: action.name,
      description: action.description,
      parameters: action.parameters,
    },
  }));

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    { role: "user", content: prompt(task) },
  ];

  if (debug) {
    console.log("> Initial messages:", messages);
  }

  let response = await openai.chat.completions.create({
    model: task.options?.model ?? "gpt-4o",
    messages,
    tools,
    tool_choice: "auto",
  });

  let message = response.choices[0]?.message;

  if (debug) {
    console.log("> Initial assistant message:", message);
  }

  // Handle function calls in a loop
  while (message?.tool_calls && message.tool_calls.length > 0) {
    // Add the assistant's message with tool calls to the conversation
    messages.push(message);

    // Process each tool call
    const toolCallResults = [];

    for (const toolCall of message.tool_calls) {
      if (toolCall.type === "function") {
        if (debug) {
          console.log("> Processing tool call:", toolCall.function);
        }

        const action = actions[toolCall.function.name];
        if (!action) {
          throw new Error(`Unknown function: ${toolCall.function.name}`);
        }

        try {
          const parsedArgs = action.parse(toolCall.function.arguments);
          const result = await action.function(parsedArgs);

          if (debug) {
            console.log("> Function result:", result);
          }

          // Check if this is a result function
          if (toolCall.function.name.startsWith("result")) {
            lastFunctionResult = result;
          }

          toolCallResults.push({
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: JSON.stringify(result),
          });
        } catch (error) {
          if (debug) {
            console.error("> Function error:", error);
          }
          toolCallResults.push({
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: JSON.stringify({ error: (error as Error).message }),
          });
        }
      }
    }

    // Add all tool results to messages
    messages.push(...toolCallResults);

    // Get the next response
    response = await openai.chat.completions.create({
      model: task.options?.model ?? "gpt-4o",
      messages,
      tools,
    });

    message = response.choices[0]?.message;

    if (debug) {
      console.log("> Next assistant message:", message);
    }
  }

  const finalContent = message?.content;

  if (debug) {
    console.log("> Final content:", finalContent);
  }

  if (!lastFunctionResult) {
    throw new Error(
      "Expected to have a result from one of the result functions",
    );
  }

  if (debug) {
    console.log("> Last function result:", lastFunctionResult);
  }

  return lastFunctionResult;
};
