import { Injectable, Logger } from '@nestjs/common';
import mjml2html = require('mjml');
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class EmailCompilerService {
  private readonly logger = new Logger(EmailCompilerService.name);
  private layoutCache: string | null = null;
  private readonly i18nCache = new Map<string, any>();
  private readonly templateDir = path.join(__dirname, 'templates');
  private readonly i18nDir = path.join(__dirname, 'i18n');

  /**
   * Compile un template MJML en HTML responsive.
   * 1. Charge le layout commun (cache en memoire)
   * 2. Charge le template specifique par langue
   * 3. Injecte le template dans le layout
   * 4. Remplace les variables {{varName}}
   * 5. Compile MJML -> HTML
   */
  compile(
    templateName: string,
    lang: string,
    variables: Record<string, string>,
  ): string | null {
    try {
      const layout = this.getLayout();
      const templateContent = this.getTemplate(templateName, lang);

      if (!templateContent) {
        this.logger.warn(`Template not found: ${lang}/${templateName}.mjml`);
        return null;
      }

      // Load i18n labels
      const labels = this.getLabels(lang);

      // Inject template into layout
      let mjmlContent = layout.replace('{{content}}', templateContent);
      mjmlContent = mjmlContent.replace('{{footerText}}', labels.footer || '');

      // Replace all variables (escaped to prevent HTML injection)
      for (const [key, value] of Object.entries(variables)) {
        mjmlContent = mjmlContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          this.escapeHtml(value || ''),
        );
      }

      // Replace any remaining label variables
      for (const [key, value] of Object.entries(labels)) {
        mjmlContent = mjmlContent.replace(
          new RegExp(`{{${key}}}`, 'g'),
          value || '',
        );
      }

      // Compile MJML to HTML
      const result = mjml2html(mjmlContent, {
        validationLevel: 'soft',
        minify: true,
      });

      if (result.errors?.length) {
        this.logger.warn(`MJML warnings for ${templateName}:`, result.errors);
      }

      return result.html;
    } catch (error) {
      this.logger.error(`Failed to compile template ${templateName}:`, error);
      return null;
    }
  }

  /**
   * Recupere le sujet d'email pour un template et une langue donnee.
   */
  getSubject(templateName: string, lang: string): string {
    const i18nData = this.getI18nData(lang);
    return i18nData?.subjects?.[templateName] || 'MojiraX Notification';
  }

  private getLayout(): string {
    if (!this.layoutCache) {
      const layoutPath = path.join(this.templateDir, 'layout.mjml');
      this.layoutCache = fs.readFileSync(layoutPath, 'utf-8');
    }
    return this.layoutCache;
  }

  private getTemplate(templateName: string, lang: string): string | null {
    try {
      const templatePath = path.join(
        this.templateDir,
        lang,
        `${templateName}.mjml`,
      );
      return fs.readFileSync(templatePath, 'utf-8');
    } catch {
      return null;
    }
  }

  private getI18nData(lang: string): any {
    if (this.i18nCache.has(lang)) {
      return this.i18nCache.get(lang);
    }
    try {
      const i18nPath = path.join(this.i18nDir, `${lang}.json`);
      const data = JSON.parse(fs.readFileSync(i18nPath, 'utf-8'));
      this.i18nCache.set(lang, data);
      return data;
    } catch {
      return {};
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getLabels(lang: string): Record<string, string> {
    const data = this.getI18nData(lang);
    return data?.labels || {};
  }
}
