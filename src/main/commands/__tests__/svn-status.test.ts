import { readSvnStatus } from '../svn-status';

jest.mock('child_process');

import { execSync } from 'child_process';
const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;

describe('readSvnStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna checkout limpo quando svn status está vazio', () => {
    const result = readSvnStatus({ checkoutPath: '/repo/svn', rawOutput: '' });

    expect(result.status).toBe('clean');
    expect(result.files).toHaveLength(0);
    expect(result.hasConflicts).toBe(false);
    expect(result.hasUnexpectedChanges).toBe(false);
    expect(result.message).toContain('sem alterações');
  });

  it('classifica arquivos M, A, D, ?, ! e C corretamente', () => {
    const rawOutput = [
      'M src/app.ts',
      'A src/novo.ts',
      'D src/deletado.ts',
      '? src/nao-versionado.ts',
      '! src/ausente.ts',
      'C src/conflito.ts'
    ].join('\n');

    const result = readSvnStatus({ checkoutPath: '/repo/svn', rawOutput });

    expect(result.files).toHaveLength(6);
    expect(result.files.find((f) => f.path === 'src/app.ts')?.status).toBe('modified');
    expect(result.files.find((f) => f.path === 'src/novo.ts')?.status).toBe('added');
    expect(result.files.find((f) => f.path === 'src/deletado.ts')?.status).toBe('deleted');
    expect(result.files.find((f) => f.path === 'src/nao-versionado.ts')?.status).toBe('unversioned');
    expect(result.files.find((f) => f.path === 'src/ausente.ts')?.status).toBe('missing');
    expect(result.files.find((f) => f.path === 'src/conflito.ts')?.status).toBe('conflicted');
  });

  it('retorna estado bloqueante quando há conflitos', () => {
    const rawOutput = 'C src/conflito.ts\nM src/app.ts';

    const result = readSvnStatus({ checkoutPath: '/repo/svn', rawOutput });

    expect(result.status).toBe('blocked');
    expect(result.hasConflicts).toBe(true);
    expect(result.message).toContain('conflitos');
  });

  it('retorna dirty quando há alterações locais sem conflito', () => {
    const rawOutput = 'M src/app.ts\nA src/novo.ts';

    const result = readSvnStatus({ checkoutPath: '/repo/svn', rawOutput });

    expect(result.status).toBe('dirty');
    expect(result.hasConflicts).toBe(false);
  });

  it('retorna dirty com hasUnexpectedChanges quando há M ou !', () => {
    const rawOutput = '! src/ausente.ts';

    const result = readSvnStatus({ checkoutPath: '/repo/svn', rawOutput });

    expect(result.status).toBe('dirty');
    expect(result.hasUnexpectedChanges).toBe(true);
  });

  it('executa svn status via execSync quando rawOutput não é fornecido', () => {
    mockExecSync.mockReturnValue('M src/app.ts' as never);

    const result = readSvnStatus({ checkoutPath: '/repo/svn' });

    expect(mockExecSync).toHaveBeenCalledWith(
      'svn status "/repo/svn"',
      expect.objectContaining({ encoding: 'utf-8', timeout: 10000 })
    );
    expect(result.files).toHaveLength(1);
    expect(result.files[0].status).toBe('modified');
  });

  it('retorna estado bloqueante quando execSync falha', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('svn: command not found');
    });

    const result = readSvnStatus({ checkoutPath: '/repo/svn' });

    expect(result.status).toBe('blocked');
    expect(result.message).toContain('Erro ao ler estado');
  });

  it('inclui rawCode e descrição em cada arquivo', () => {
    const rawOutput = 'M src/app.ts';

    const result = readSvnStatus({ checkoutPath: '/repo/svn', rawOutput });

    expect(result.files[0]).toEqual({
      path: 'src/app.ts',
      status: 'modified',
      rawCode: 'M',
      description: 'Modificado localmente'
    });
  });
});
