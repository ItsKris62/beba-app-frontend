import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useLoanApplicationStore } from './useLoanApplicationStore';

function readPersistedDraft() {
  const raw = sessionStorage.getItem('beba-loan-application-draft');
  return raw ? JSON.parse(raw) : null;
}

describe('useLoanApplicationStore', () => {
  beforeEach(() => {
    sessionStorage.clear();
    useLoanApplicationStore.getState().reset();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('persists wizard progress to sessionStorage, not localStorage', () => {
    useLoanApplicationStore.getState().setProduct('product-1');
    useLoanApplicationStore.getState().setTerms('50000', '12', 'School fees');

    const persisted = readPersistedDraft();
    expect(persisted?.state.loanProductId).toBe('product-1');
    expect(persisted?.state.principalAmount).toBe('50000');
    expect(persisted?.state.step).toBe('guarantors');
    expect(localStorage.getItem('beba-loan-application-draft')).toBeNull();
  });

  it('generates the idempotency key once and reuses it on subsequent calls', () => {
    const store = useLoanApplicationStore.getState();
    const first = store.ensureIdempotencyKey();
    const second = useLoanApplicationStore.getState().ensureIdempotencyKey();
    expect(first).toBe(second);
    expect(readPersistedDraft()?.state.idempotencyKey).toBe(first);
  });

  it('adds a guarantor without duplicating an existing one', () => {
    const guarantor = { memberId: 'm1', maskedName: 'J*** D**' };
    useLoanApplicationStore.getState().addGuarantor(guarantor);
    useLoanApplicationStore.getState().addGuarantor(guarantor);
    expect(useLoanApplicationStore.getState().guarantors).toHaveLength(1);
  });

  it('reset() clears both in-memory state and the persisted sessionStorage draft', () => {
    useLoanApplicationStore.getState().setProduct('product-1');
    useLoanApplicationStore.getState().ensureIdempotencyKey();
    expect(readPersistedDraft()?.state.loanProductId).toBe('product-1');

    useLoanApplicationStore.getState().reset();

    const state = useLoanApplicationStore.getState();
    expect(state.loanProductId).toBe('');
    expect(state.idempotencyKey).toBeNull();
    expect(state.step).toBe('product');
    expect(readPersistedDraft()?.state.loanProductId).toBe('');
  });
});
