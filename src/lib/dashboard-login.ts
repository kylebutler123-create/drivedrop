export function dashboardAccount(path: string) {
  if (path === '/customer') return 'customer';
  if (path === '/transporter') return 'transporter';
  return null;
}

/** Only return to the exact local dashboard for the requested account. Keep its view and booking anchor. */
export function dashboardLoginTarget(params: Pick<URLSearchParams, 'get'>) {
  const href = params.get('returnTo');
  if (!href) return null;
  const account = dashboardAccount(href.split(/[?#]/, 1)[0]);
  if (!account || account !== params.get('account')) return null;
  return {
    href,
    role: account === 'customer' ? 'CUSTOMER' as const : 'TRANSPORTER' as const,
    notice: params.get('switchAccount') === '1'
      ? `This link needs a ${account} account. Sign in below to switch accounts.`
      : null,
  };
}
