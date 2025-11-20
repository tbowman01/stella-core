/**
 * AI client abstraction for Anthropic and OpenAI
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { AIConfig, AIProvider } from './types';

let anthropicClient: Anthropic | null = null;
let openaiClient: OpenAI | null = null;

/**
 * Initialize AI client
 */
export function initializeAI(config: AIConfig): void {
  if (config.provider === 'anthropic') {
    anthropicClient = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  } else if (config.provider === 'openai') {
    openaiClient = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY,
    });
  }
}

/**
 * Get Anthropic client
 */
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

/**
 * Get OpenAI client
 */
export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
}

/**
 * Generate completion with Anthropic Claude
 */
export async function generateWithClaude(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<{ text: string; tokensUsed: number }> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: options.model || 'claude-3-5-sonnet-20241022',
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
    system: options.system,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';

  return {
    text,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

/**
 * Generate completion with OpenAI GPT
 */
export async function generateWithGPT(
  prompt: string,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<{ text: string; tokensUsed: number }> {
  const client = getOpenAIClient();

  const messages: any[] = [];
  if (options.system) {
    messages.push({ role: 'system', content: options.system });
  }
  messages.push({ role: 'user', content: prompt });

  const response = await client.chat.completions.create({
    model: options.model || 'gpt-4-turbo-preview',
    max_tokens: options.maxTokens || 4096,
    temperature: options.temperature || 0.7,
    messages,
  });

  const text = response.choices[0]?.message?.content || '';
  const tokensUsed = response.usage?.total_tokens || 0;

  return { text, tokensUsed };
}

/**
 * Generate with fallback
 */
export async function generateWithFallback(
  prompt: string,
  primaryProvider: AIProvider,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    system?: string;
  } = {}
): Promise<{ text: string; tokensUsed: number; provider: AIProvider }> {
  try {
    if (primaryProvider === 'anthropic') {
      const result = await generateWithClaude(prompt, options);
      return { ...result, provider: 'anthropic' };
    } else {
      const result = await generateWithGPT(prompt, options);
      return { ...result, provider: 'openai' };
    }
  } catch (error) {
    console.error(`Primary provider ${primaryProvider} failed, trying fallback:`, error);

    // Try fallback
    const fallbackProvider = primaryProvider === 'anthropic' ? 'openai' : 'anthropic';

    if (fallbackProvider === 'anthropic') {
      const result = await generateWithClaude(prompt, options);
      return { ...result, provider: 'anthropic' };
    } else {
      const result = await generateWithGPT(prompt, options);
      return { ...result, provider: 'openai' };
    }
  }
}

/**
 * Calculate cost based on tokens and model
 */
export function calculateCost(provider: AIProvider, model: string, tokensUsed: number): number {
  const pricing: Record<string, { input: number; output: number }> = {
    // Anthropic (per million tokens)
    'claude-3-5-sonnet-20241022': { input: 3.0, output: 15.0 },
    'claude-3-opus-20240229': { input: 15.0, output: 75.0 },

    // OpenAI (per million tokens)
    'gpt-4-turbo-preview': { input: 10.0, output: 30.0 },
    'gpt-4': { input: 30.0, output: 60.0 },
    'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
  };

  const rates = pricing[model] || { input: 1.0, output: 3.0 };

  // Assume 50/50 split for simplicity (could track separately)
  const avgRate = (rates.input + rates.output) / 2;

  return (tokensUsed / 1_000_000) * avgRate;
}
