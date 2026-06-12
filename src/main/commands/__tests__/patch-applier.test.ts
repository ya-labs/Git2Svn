import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { applyPatch } from '../patch-applier';

jest.mock('child_process');
jest.mock('fs');

const mockExecSync = execSync as jest.MockedFunction<typeof execSync>;
const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockUnlinkSync = unlinkSync as jest.MockedFunction<typeof unlinkSync>;

const validInput = {
  checkoutPath: '/repo/svn',
  patchContent: 'diff ...',
  patchValidated: true,
  checkoutValidated: true,
  confirmed: true
};

describe('applyPatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWriteFileSync.mockImplementation(() => undefined);
    mockUnlinkSync.mockImplementation(() => undefined);
  });

  it('bloqueia quando não há confirmação explícita', () => {
    const result = applyPatch({ ...validInput, confirmed: false });

    expect(result.status).toBe('blocked');
    expect(result.applied).toBe(false);
    expect(result.errorCode).toBe('NOT_CONFIRMED');
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('bloqueia quando checkout não foi validado', () => {
    const result = applyPatch({ ...validInput, checkoutValidated: false });

    expect(result.status).toBe('blocked');
    expect(result.applied).toBe(false);
    expect(result.errorCode).toBe('CHECKOUT_NOT_VALIDATED');
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('bloqueia quando patch não foi pré-validado', () => {
    const result = applyPatch({ ...validInput, patchValidated: false });

    expect(result.status).toBe('blocked');
    expect(result.applied).toBe(false);
    expect(result.errorCode).toBe('PATCH_NOT_VALIDATED');
    expect(mockExecSync).not.toHaveBeenCalled();
  });

  it('aplica patch quando todas as condições estão satisfeitas', () => {
    mockExecSync.mockReturnValue('patching file src/app.ts\npatching file src/novo.ts' as never);

    const result = applyPatch(validInput);

    expect(result.status).toBe('applied');
    expect(result.applied).toBe(true);
    expect(result.affectedFiles).toEqual(['src/app.ts', 'src/novo.ts']);
    expect(result.message).toContain('sucesso');
  });

  it('retorna error quando git apply falha durante a aplicação', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('patch failed to apply');
    });

    const result = applyPatch(validInput);

    expect(result.status).toBe('error');
    expect(result.applied).toBe(false);
    expect(result.errorCode).toBe('APPLY_FAILED');
    expect(result.message).toContain('Erro durante');
  });

  it('não executa commit SVN', () => {
    mockExecSync.mockReturnValue('' as never);

    applyPatch(validInput);

    const calls = mockExecSync.mock.calls.map((c) => c[0] as string);
    expect(calls.every((cmd) => !cmd.includes('svn commit'))).toBe(true);
  });

  it('remove arquivo temporário mesmo em caso de erro', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('erro');
    });

    applyPatch(validInput);

    expect(mockUnlinkSync).toHaveBeenCalled();
  });
});
