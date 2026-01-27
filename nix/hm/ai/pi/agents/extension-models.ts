/**
 * Centralized model configuration for pi extensions
 *
 * This file maintains all hardcoded model defaults used across extensions.
 * Models can be overridden via environment variables in the format:
 * - "model_name" (uses default provider)
 * - "provider:model_name" (specifies both provider and model)
 */

export const EXTENSION_MODELS = {
  // Model Preset Extension
  MODEL_PRESET: {
    SMART: {
      model: "codex/gpt-5.2-codex-medium",
      provider: "openai-sdk",
      envVar: "PI_SMART_MODEL",
    },
    RUSH: {
      // model: "bender-muffin",
      model: "all/claude-opus-4-5",
      provider: "ant-sdk",
      envVar: "PI_RUSH_MODEL",
    },
  },

  // Explore Extension
  EXPLORE: {
    model: "ark-ant/ark-code",
    provider: "ant-sdk",
    envVar: "PI_EXPLORE_MODEL",
  },

  // Review Extension
  REVIEW: {
    model: "codex/gpt-5.2-codex-xhigh",
    provider: "openai-sdk",
    envVar: "PI_REVIEW_MODEL",
  },

  // Librarian Extension
  LIBRARIAN: {
    model: "codex/gpt-5.2-low",
    provider: "openai-sdk",
    envVar: "PI_LIBRARIAN_MODEL",
  },

  // KG Insight Extension
  KG_INSIGHT: {
    model: "ark-ant/ark-code",
    provider: "ant-sdk",
    envVar: "PI_INSIGHT_MODEL",
    fallbackEnvVar: "PI_REVIEW_MODEL",
  },

  // Chrome DevTools Extension
  CHROME_DEV: {
    model: "codex/gpt-5.2-codex-medium",
    provider: "ant-sdk",
    envVar: "PI_CHROME_DEV_MODEL",
  },

  // Semantic Read Extension (for handoff context extraction)
  SEMANTIC_READ: {
    model: "ark-ant/ark-code",
    provider: "ant-sdk",
    envVar: "PI_SEMANTIC_READ_MODEL",
  },

  // Handoff Extension (context transfer to new session)
  HANDOFF: {
    model: "ark-ant/ark-code",
    provider: "ant-sdk",
    envVar: "PI_HANDOFF_MODEL",
  },
} as const;

/**
 * Static defaults derived from EXTENSION_MODELS (no environment resolution)
 * Use this when you need the built-in defaults without env override resolution
 */
export const EXTENSION_MODEL_DEFAULTS = {
  MODEL_PRESET: {
    SMART: {
      model: EXTENSION_MODELS.MODEL_PRESET.SMART.model,
      provider: EXTENSION_MODELS.MODEL_PRESET.SMART.provider,
    },
    RUSH: {
      model: EXTENSION_MODELS.MODEL_PRESET.RUSH.model,
      provider: EXTENSION_MODELS.MODEL_PRESET.RUSH.provider,
    },
  },
  EXPLORE: {
    model: EXTENSION_MODELS.EXPLORE.model,
    provider: EXTENSION_MODELS.EXPLORE.provider,
  },
  REVIEW: {
    model: EXTENSION_MODELS.REVIEW.model,
    provider: EXTENSION_MODELS.REVIEW.provider,
  },
  LIBRARIAN: {
    model: EXTENSION_MODELS.LIBRARIAN.model,
    provider: EXTENSION_MODELS.LIBRARIAN.provider,
  },
  KG_INSIGHT: {
    model: EXTENSION_MODELS.KG_INSIGHT.model,
    provider: EXTENSION_MODELS.KG_INSIGHT.provider,
  },
  CHROME_DEV: {
    model: EXTENSION_MODELS.CHROME_DEV.model,
    provider: EXTENSION_MODELS.CHROME_DEV.provider,
  },
  SEMANTIC_READ: {
    model: EXTENSION_MODELS.SEMANTIC_READ.model,
    provider: EXTENSION_MODELS.SEMANTIC_READ.provider,
  },
  HANDOFF: {
    model: EXTENSION_MODELS.HANDOFF.model,
    provider: EXTENSION_MODELS.HANDOFF.provider,
  },
} as const;

/**
 * Helper function to get model configuration with environment variable override
 */
export function getModelConfig(extension: keyof typeof EXTENSION_MODELS, variant?: string) {
  const config = EXTENSION_MODELS[extension];

  // Handle nested configs (like MODEL_PRESET with SMART/RUSH variants)
  if (variant && "SMART" in config) {
    const variantConfig = config[variant as keyof typeof config];
    if (variantConfig && typeof variantConfig === "object" && "envVar" in variantConfig) {
      const result = getConfigWithEnvOverride(variantConfig);
      validateModelConfig(result, `${extension}.${variant}`);
      return result;
    }
    throw new Error(
      `Invalid variant '${variant}' for extension '${extension}'. Valid variants: SMART, RUSH`,
    );
  }

  // Handle regular configs (no variant expected)
  if (!variant && "envVar" in config) {
    const result = getConfigWithEnvOverride(config as any);
    validateModelConfig(result, extension);
    return result;
  }

  // If we get here, there was a mismatch between extension type and variant usage
  if (variant) {
    throw new Error(
      `Extension '${extension}' does not support variants, but variant '${variant}' was provided`,
    );
  } else {
    throw new Error(`Invalid extension or configuration: ${extension}`);
  }
}

/**
 * Parse environment variable override in format "provider:model" or "model"
 */
function getConfigWithEnvOverride(config: {
  model: string;
  provider: string;
  envVar: string;
  fallbackEnvVar?: string;
}) {
  // Check primary env var first, then fallback if specified
  const envValue =
    process.env[config.envVar] || (config.fallbackEnvVar && process.env[config.fallbackEnvVar]);

  if (envValue) {
    if (envValue.includes(":")) {
      const [provider, model] = envValue.split(":", 2);
      return { provider, model };
    } else {
      return { provider: config.provider, model: envValue };
    }
  }

  return { provider: config.provider, model: config.model };
}

/**
 * Type definitions for model configurations
 */
export type ExtensionModelConfig = {
  model: string;
  provider: string;
  envVar: string;
  fallbackEnvVar?: string;
};

/**
 * Parse environment variable override in format "provider:model" or "model"
 * This function is used at runtime to respect current process.env values
 */
export function parseEnvOverride(
  envValue: string | undefined,
  fallback: { model: string; provider: string },
): { provider: string; model: string } {
  if (!envValue) {
    return { provider: fallback.provider, model: fallback.model };
  }

  if (envValue.includes(":")) {
    const [provider, model] = envValue.split(":", 2);
    return {
      provider: provider || fallback.provider,
      model: model || fallback.model,
    };
  }

  return { provider: fallback.provider, model: envValue };
}

/**
 * Get runtime model configuration with environment variable resolution
 * Use this when you need current env values resolved at runtime
 */
export function getRuntimeModelConfig(
  extension: keyof typeof EXTENSION_MODELS,
  variant?: string,
): { provider: string; model: string } {
  const config = EXTENSION_MODELS[extension];

  if (!config) {
    throw new Error(
      `Unknown extension '${extension}'. Available: ${Object.keys(EXTENSION_MODELS).join(", ")}`,
    );
  }

  // Handle nested configs (like MODEL_PRESET with SMART/RUSH variants)
  if (variant && "SMART" in config) {
    const variantConfig = config[variant as keyof typeof config];
    if (variantConfig && typeof variantConfig === "object" && "envVar" in variantConfig) {
      const envValue = process.env[variantConfig.envVar];
      const result = parseEnvOverride(envValue, variantConfig);
      validateModelConfig(result, `${extension}.${variant}`);
      return result;
    }
    throw new Error(
      `Invalid variant '${variant}' for extension '${extension}'. Valid variants: SMART, RUSH`,
    );
  }

  // Handle regular configs (no variant expected)
  if (!variant && "envVar" in config) {
    // Check primary env var first, then fallback if specified
    const fallbackEnvVar = "fallbackEnvVar" in config ? config.fallbackEnvVar : undefined;
    const envValue = process.env[config.envVar] || (fallbackEnvVar && process.env[fallbackEnvVar]);
    const result = parseEnvOverride(envValue, config);
    validateModelConfig(result, extension);
    return result;
  }

  // If we get here, there was a mismatch between extension type and variant usage
  if (variant) {
    throw new Error(
      `Extension '${extension}' does not support variants, but variant '${variant}' was provided`,
    );
  } else {
    throw new Error(`Invalid extension or configuration: ${extension}`);
  }
}

export type ModelPresetVariant = "SMART" | "RUSH";

/**
 * Validate model configuration before use.
 * Throws descriptive error if provider or model is missing.
 */
export function validateModelConfig(
  config: { provider: string; model: string },
  context: string,
): void {
  if (!config.provider) {
    throw new Error(
      `[${context}] Missing provider. Model config must have both 'provider' and 'model' fields.`,
    );
  }
  if (!config.model) {
    throw new Error(
      `[${context}] Missing model. Model config must have both 'provider' and 'model' fields.`,
    );
  }
}
