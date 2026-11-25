const humanize = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());

const useful = value => {
  const text = String(value || '').trim();
  return text && !['not provided', 'no account holder', 'unnamed account'].includes(text.toLowerCase()) ? text : '';
};

const withoutInstitutionPrefix = (value, institution) => {
  let text = useful(value);
  const institutionName = useful(institution);
  if (!text || !institutionName) return text;
  if (text.localeCompare(institutionName, 'en', { sensitivity: 'base' }) === 0) return '';

  const escapedInstitution = institutionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = new RegExp(`^${escapedInstitution}(?:\\s*[-–—:|·]\\s*|\\s+)`, 'i');
  while (text && prefix.test(text)) text = text.replace(prefix, '').trim();
  return text;
};

export function financialAccountInstitutionName(account = {}) {
  const nested = account.financial_account || account.financialAccount || account.account || {};
  const institution = account.financial_institution || account.financialInstitution || account.institution
    || nested.financial_institution || nested.financialInstitution || nested.institution || {};
  return useful(institution.name || institution.display_name || institution.short_name
    || account.financial_institution_name || account.institution_name || account.bank_name);
}

export function financialAccountHolderName(account = {}) {
  const nested = account.financial_account || account.financialAccount || account.account || {};
  const user = account.user_account || account.userAccount || nested.user_account || nested.userAccount || {};
  const holder = account.holderName || user.name || user.full_name || user.display_name || user.username
    || account.account_holder_name || account.cardholder_name || account.card_holder_name
    || nested.account_holder_name || nested.cardholder_name || nested.card_holder_name;
  return withoutInstitutionPrefix(holder, financialAccountInstitutionName(account));
}

export function financialAccountNumber(account = {}) {
  const nested = account.financial_account || account.financialAccount || account.account || {};
  return useful(account.accountNumber || account.masked_account_number || account.account_number_masked
    || account.masked_number || (account.account_number_last4 ? `•••• ${account.account_number_last4}` : '')
    || nested.masked_account_number || nested.account_number_masked || nested.masked_number
    || (nested.account_number_last4 ? `•••• ${nested.account_number_last4}` : ''));
}

export function financialAccountProductName(account = {}) {
  const nested = account.financial_account || account.financialAccount || account.account || {};
  const institution = financialAccountInstitutionName(account);
  let name = useful(account.name || account.account_name || account.display_name || nested.name || nested.account_name)
    || humanize(account.kind || nested.kind)
    || `Account ${account.id || nested.id || ''}`.trim();
  if (!institution) return name;

  name = withoutInstitutionPrefix(name, institution);
  return name || humanize(account.kind || nested.kind) || 'Financial Account';
}

export function financialAccountOptionLabel(account = {}, options = {}) {
  const { includeBalance = false, balance = 'available' } = options;
  const institution = financialAccountInstitutionName(account);
  const product = financialAccountProductName(account);
  const holder = financialAccountHolderName(account);
  const number = financialAccountNumber(account);
  const parts = [institution, product, holder, number].filter(Boolean);

  if (includeBalance) {
    const available = account.availableBalance ?? account.available_balance ?? account.available_credit;
    const current = account.currentBalance ?? account.current_balance ?? account.balance;
    const amount = balance === 'current' ? (current ?? available) : (available ?? current);
    if (amount != null && amount !== '') {
      const currency = account.currency || 'PHP';
      const formatted = new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(Number(amount || 0));
      parts.push(`${formatted} ${balance === 'current' ? 'current' : 'available'}`);
    }
  }

  return parts.join(' · ');
}
