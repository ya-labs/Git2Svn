import { buildFlowNavigationState } from '../flow-navigation';

describe('buildFlowNavigationState', () => {
  it('deixa claro onde o usuário está no fluxo', () => {
    const result = buildFlowNavigationState({
      activeStep: 'preview',
      prerequisites: {
        environmentReady: true
      }
    });

    expect(result.activeStep).toBe('preview');
    expect(result.items.find((i) => i.key === 'preview')?.isActive).toBe(true);
    expect(result.message).toContain('Preview');
  });

  it('marca etapas dependentes como bloqueadas quando pré-condições falham', () => {
    const result = buildFlowNavigationState({
      activeStep: 'environment',
      prerequisites: {
        environmentReady: false,
        previewReady: false,
        applyReady: false,
        commitReady: false
      }
    });

    const preview = result.items.find((i) => i.key === 'preview');
    const apply = result.items.find((i) => i.key === 'apply');
    const commit = result.items.find((i) => i.key === 'commit');

    expect(preview?.isBlocked).toBe(true);
    expect(apply?.isBlocked).toBe(true);
    expect(commit?.isBlocked).toBe(true);
  });

  it('diferencia preparação, validação e publicação', () => {
    const result = buildFlowNavigationState({
      activeStep: 'apply',
      prerequisites: {
        environmentReady: true,
        previewReady: true,
        applyReady: false,
        commitReady: false
      }
    });

    expect(result.items.find((i) => i.key === 'environment')?.category).toBe('preparation');
    expect(result.items.find((i) => i.key === 'preview')?.category).toBe('validation');
    expect(result.items.find((i) => i.key === 'apply')?.category).toBe('validation');
    expect(result.items.find((i) => i.key === 'commit')?.category).toBe('publication');
    expect(result.items.find((i) => i.key === 'packages')?.category).toBe('publication');
  });

  it('permite retornar para etapas anteriores', () => {
    const result = buildFlowNavigationState({
      activeStep: 'commit',
      prerequisites: {
        environmentReady: true,
        previewReady: true,
        applyReady: true,
        commitReady: false
      }
    });

    expect(result.canGoBack).toBe(true);
    expect(result.previousSteps).toEqual(['environment', 'preview', 'apply']);
  });

  it('evita avanço para ações sensíveis sem validações necessárias', () => {
    const result = buildFlowNavigationState({
      activeStep: 'preview',
      prerequisites: {
        environmentReady: true,
        previewReady: false,
        applyReady: false,
        commitReady: false
      }
    });

    const apply = result.items.find((i) => i.key === 'apply');
    const commit = result.items.find((i) => i.key === 'commit');

    expect(apply?.isAccessible).toBe(false);
    expect(apply?.blockReason).toContain('Aplicação bloqueada');
    expect(commit?.isAccessible).toBe(false);
  });

  it('mantém etapas anteriores acessíveis mesmo quando pré-condições atuais falham', () => {
    const result = buildFlowNavigationState({
      activeStep: 'apply',
      prerequisites: {
        environmentReady: true,
        previewReady: true,
        applyReady: false,
        commitReady: false
      }
    });

    expect(result.items.find((i) => i.key === 'environment')?.isAccessible).toBe(true);
    expect(result.items.find((i) => i.key === 'preview')?.isAccessible).toBe(true);
  });
});
