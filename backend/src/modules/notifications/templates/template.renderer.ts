import { Injectable } from '@nestjs/common';
import { ContextLogger } from '../../../common/logger/context-logger';
import type { Ctx } from '../../../common/types/context';

/**
 * Template renderer that substitutes {{variable}} placeholders with actual values.
 */
@Injectable()
export class TemplateRenderer {
  private readonly logger = new ContextLogger(TemplateRenderer.name);

  /**
   * Render a template string by substituting all {{variable}} placeholders
   * with values from the provided variables object.
   */
  render(
    ctx: Ctx,
    template: string,
    variables: Record<string, string>,
  ): string {
    let result = template;

    // Replace all {{variable}} patterns
    const pattern = /\{\{(\w+)\}\}/g;
    result = result.replace(pattern, (match, variableName) => {
      if (variableName in variables) {
        return variables[variableName];
      }
      // Keep the placeholder if variable not found
      this.logger.warn(
        ctx,
        `Template variable {{${variableName}}} not found in provided variables`,
      );
      return match;
    });

    return result;
  }

  /**
   * Extract all variable names from a template string
   */
  extractVariables(template: string): string[] {
    const pattern = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  /**
   * Validate that all required variables are provided
   */
  validateVariables(
    template: string,
    variables: Record<string, string>,
  ): { valid: boolean; missing: string[] } {
    const required = this.extractVariables(template);
    const missing = required.filter((v) => !(v in variables));

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}
