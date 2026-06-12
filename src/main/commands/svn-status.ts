import { execSync } from 'child_process';

export type SvnFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'unversioned'
  | 'missing'
  | 'conflicted'
  | 'unknown';

export type SvnCheckoutStateStatus = 'clean' | 'dirty' | 'blocked';

export interface SvnStatusFile {
  path: string;
  status: SvnFileStatus;
  rawCode: string;
  description: string;
}

export interface SvnCheckoutState {
  status: SvnCheckoutStateStatus;
  message: string;
  files: SvnStatusFile[];
  hasConflicts: boolean;
  hasUnexpectedChanges: boolean;
}

export interface ReadSvnStatusInput {
  checkoutPath: string;
  rawOutput?: string;
}

const SVN_STATUS_DESCRIPTIONS: Record<SvnFileStatus, string> = {
  modified: 'Modificado localmente',
  added: 'Adicionado para versionamento',
  deleted: 'Removido do versionamento',
  unversioned: 'Não versionado',
  missing: 'Ausente no disco',
  conflicted: 'Em conflito',
  unknown: 'Estado desconhecido'
};

function mapSvnCode(code: string): SvnFileStatus {
  switch (code) {
    case 'M': return 'modified';
    case 'A': return 'added';
    case 'D': return 'deleted';
    case '?': return 'unversioned';
    case '!': return 'missing';
    case 'C': return 'conflicted';
    default: return 'unknown';
  }
}

function parseSvnStatusOutput(output: string): SvnStatusFile[] {
  return output
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const rawCode = line.charAt(0);
      const path = line.slice(1).trim();
      const status = mapSvnCode(rawCode);
      return {
        path,
        status,
        rawCode,
        description: SVN_STATUS_DESCRIPTIONS[status]
      };
    });
}

function buildCheckoutState(files: SvnStatusFile[]): SvnCheckoutState {
  const hasConflicts = files.some((f) => f.status === 'conflicted');
  const hasUnexpectedChanges = files.some(
    (f) => f.status === 'modified' || f.status === 'missing'
  );

  if (files.length === 0) {
    return {
      status: 'clean',
      message: 'Checkout SVN sem alterações locais.',
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: false
    };
  }

  if (hasConflicts) {
    return {
      status: 'blocked',
      message: 'Checkout SVN possui conflitos. Resolva os conflitos antes de prosseguir.',
      files,
      hasConflicts: true,
      hasUnexpectedChanges
    };
  }

  if (hasUnexpectedChanges) {
    return {
      status: 'dirty',
      message: 'Checkout SVN possui alterações locais inesperadas.',
      files,
      hasConflicts: false,
      hasUnexpectedChanges: true
    };
  }

  return {
    status: 'dirty',
    message: 'Checkout SVN possui alterações locais.',
    files,
    hasConflicts: false,
    hasUnexpectedChanges: false
  };
}

export function readSvnStatus(input: ReadSvnStatusInput): SvnCheckoutState {
  try {
    const output = input.rawOutput !== undefined
      ? input.rawOutput
      : execSync(`svn status "${input.checkoutPath}"`, {
          encoding: 'utf-8',
          timeout: 10000,
          stdio: ['pipe', 'pipe', 'pipe']
        });

    const files = parseSvnStatusOutput(output);
    return buildCheckoutState(files);
  } catch (error) {
    return {
      status: 'blocked',
      message: `Erro ao ler estado do checkout SVN: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      files: [],
      hasConflicts: false,
      hasUnexpectedChanges: false
    };
  }
}
