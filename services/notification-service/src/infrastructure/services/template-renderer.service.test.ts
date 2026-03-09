import { TemplateRendererService } from './template-renderer.service';

describe('TemplateRendererService', () => {
  it('replaces placeholders for provided variables globally', () => {
    const service = new TemplateRendererService();
    const result = service.render('Hi {{name}}, code {{code}}, again {{name}}', {
      name: 'Asha',
      code: '1234'
    });

    expect(result).toBe('Hi Asha, code 1234, again Asha');
  });

  it('escapes unsafe html characters', () => {
    const service = new TemplateRendererService();
    const escaped = service.sanitizeHtml('<div class="x">It\'s fine</div>');

    expect(escaped).toBe('&lt;div class=&quot;x&quot;&gt;It&#39;s fine&lt;/div&gt;');
  });
});

