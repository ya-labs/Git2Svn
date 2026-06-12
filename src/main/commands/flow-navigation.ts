export type FlowStepKey =
  | 'environment'
  | 'preview'
  | 'apply'
  | 'commit'
  | 'packages';

export interface FlowStepPrerequisites {
  environmentReady?: boolean;
  previewReady?: boolean;
  applyReady?: boolean;
  commitReady?: boolean;
}

export interface FlowNavigationItem {
  key: FlowStepKey;
  label: string;
  category: 'preparation' | 'validation' | 'publication';
  isActive: boolean;
  isAccessible: boolean;
  isBlocked: boolean;
  blockReason?: string;
}

export interface FlowNavigationState {
  activeStep: FlowStepKey;
  items: FlowNavigationItem[];
  canGoBack: boolean;
  previousSteps: FlowStepKey[];
  message: string;
}

export interface BuildFlowNavigationInput {
  activeStep: FlowStepKey;
  prerequisites?: FlowStepPrerequisites;
}

const FLOW_STEPS: Array<{ key: FlowStepKey; label: string; category: FlowNavigationItem['category'] }> = [
  { key: 'environment', label: 'Ambiente', category: 'preparation' },
  { key: 'preview', label: 'Preview', category: 'validation' },
  { key: 'apply', label: 'Aplicação SVN', category: 'validation' },
  { key: 'commit', label: 'Commit SVN', category: 'publication' },
  { key: 'packages', label: 'Pacotes SVNFlow', category: 'publication' }
];

function getBlockReason(step: FlowStepKey, prerequisites: FlowStepPrerequisites): string | undefined {
  if (step === 'preview' && !prerequisites.environmentReady) {
    return 'Preview bloqueado até validar o ambiente.';
  }

  if (step === 'apply' && !prerequisites.previewReady) {
    return 'Aplicação bloqueada até finalizar preview e validações.';
  }

  if (step === 'commit' && !prerequisites.applyReady) {
    return 'Commit bloqueado até concluir aplicação e revisão no checkout SVN.';
  }

  if (step === 'packages' && !prerequisites.commitReady) {
    return 'Pacotes bloqueados até concluir fluxo de commit protegido.';
  }

  return undefined;
}

function resolveAccessibility(step: FlowStepKey, prerequisites: FlowStepPrerequisites): { isAccessible: boolean; isBlocked: boolean; blockReason?: string } {
  const blockReason = getBlockReason(step, prerequisites);

  if (!blockReason) {
    return {
      isAccessible: true,
      isBlocked: false
    };
  }

  return {
    isAccessible: false,
    isBlocked: true,
    blockReason
  };
}

export function buildFlowNavigationState(input: BuildFlowNavigationInput): FlowNavigationState {
  const activeIndex = FLOW_STEPS.findIndex((step) => step.key === input.activeStep);

  const prerequisites: FlowStepPrerequisites = {
    environmentReady: input.prerequisites?.environmentReady ?? false,
    previewReady: input.prerequisites?.previewReady ?? false,
    applyReady: input.prerequisites?.applyReady ?? false,
    commitReady: input.prerequisites?.commitReady ?? false
  };

  const items = FLOW_STEPS.map((step, index) => {
    const access = resolveAccessibility(step.key, prerequisites);
    const isPrevious = index < activeIndex;

    return {
      key: step.key,
      label: step.label,
      category: step.category,
      isActive: step.key === input.activeStep,
      isAccessible: isPrevious || access.isAccessible,
      isBlocked: !isPrevious && access.isBlocked,
      blockReason: !isPrevious ? access.blockReason : undefined
    };
  });

  const previousSteps = FLOW_STEPS.slice(0, activeIndex).map((step) => step.key);

  return {
    activeStep: input.activeStep,
    items,
    canGoBack: previousSteps.length > 0,
    previousSteps,
    message: `Fluxo ativo em ${FLOW_STEPS[activeIndex]?.label ?? 'Ambiente'}.`
  };
}
