const WRAPPER_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>TicketsHub</title>
</head>
<body style="margin:0;padding:0;background-color:#f2f1ed;font-family:'Outfit',system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;">
  <style>
    a { color: inherit; }
    p { margin: 0; }

    /* th-wrap: font/color only — white card is provided by the outer table */
    .th-wrap {
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      color: #19191a;
    }

    /* Header */
    .th-header { padding: 24px 32px 20px; border-bottom: 1px solid #f0f0ea; }
    .th-logo-text { font-size: 17px; font-weight: 600; color: #19191a; letter-spacing: -0.02em; }
    .th-logo-text span { color: #00c98d; }

    /* Body */
    .th-body { padding: 32px 32px 24px; }

    /* Icon */
    .th-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      font-size: 18px;
      line-height: 44px;
      text-align: center;
      margin-bottom: 20px;
    }
    .th-icon--success { background-color: #e6faf2; color: #006646; }
    .th-icon--warning { background-color: #fff8ec; color: #7a4d00; }
    .th-icon--danger  { background-color: #fef1f1; color: #a82020; }
    .th-icon--info    { background-color: #eef4ff; color: #1a4db0; }
    .th-icon--neutral { background-color: #f8f8f5; color: #5a5a58; }

    /* Typography */
    .th-title { font-size: 21px; font-weight: 600; color: #19191a; line-height: 1.3; margin: 0 0 10px; letter-spacing: -0.02em; }
    .th-text  { font-size: 15px; color: #5a5a58; line-height: 1.7; margin: 0 0 14px; }
    .th-text:last-of-type { margin-bottom: 0; }

    /* Info box — CSS table layout for Gmail compatibility (no flexbox, no overflow:hidden clearfix) */
    .th-info-box {
      background-color: #f8f8f5;
      border: 1px solid #e5e5df;
      border-radius: 12px;
      padding: 4px 20px;
      margin: 22px 0;
    }
    .th-row { display: table; width: 100%; box-sizing: border-box; padding: 11px 0; border-bottom: 1px solid #f0f0ea; }
    .th-row:last-child { border-bottom: none; }
    .th-label { display: table-cell; font-size: 13px; color: #9a9a96; white-space: nowrap; padding-right: 16px; vertical-align: top; padding-top: 1px; }
    .th-value { display: table-cell; font-size: 13px; font-weight: 500; color: #19191a; text-align: right; word-break: break-word; width: 100%; }
    .th-value--highlight { color: #00a372; font-size: 14px; }

    /* OTP */
    .th-code-block { background-color: #f8f8f5; border: 1px solid #e5e5df; border-radius: 12px; padding: 28px; text-align: center; margin: 24px 0; }
    .th-code { font-size: 38px; font-weight: 700; letter-spacing: 0.22em; color: #19191a; font-family: 'Courier New', monospace; }
    .th-code-hint { display: block; font-size: 12px; color: #9a9a96; margin-top: 10px; }

    /* Alerts */
    .th-alert { border-radius: 8px; padding: 12px 16px; margin: 20px 0; font-size: 14px; line-height: 1.6; }
    .th-alert p { margin: 0; color: inherit; }
    .th-alert--success { background-color: #e6faf2; border-left: 3px solid #00c98d; color: #006646; }
    .th-alert--warning { background-color: #fff8ec; border-left: 3px solid #f5a623; color: #7a4d00; }
    .th-alert--danger  { background-color: #fef1f1; border-left: 3px solid #e84c4c; color: #a82020; }
    .th-alert--info    { background-color: #eef4ff; border-left: 3px solid #3b82f6; color: #1a4db0; }

    /* Buttons */
    .th-btn-wrap  { margin: 26px 0 8px; text-align: center; }
    .th-btn-group { margin: 26px 0 8px; text-align: center; }
    .th-btn {
      display: inline-block;
      background-color: #00c98d;
      color: #ffffff !important;
      font-family: 'Outfit', system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      padding: 11px 28px;
      border-radius: 8px;
      letter-spacing: 0.01em;
      margin: 4px;
    }
    .th-btn--secondary { background-color: transparent; color: #19191a !important; border: 1px solid #e5e5df; }

    /* Tag */
    .th-tag { display: inline-block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; padding: 3px 8px; border-radius: 4px; margin-bottom: 16px; }
    .th-tag--info    { background-color: #eef4ff; color: #1a4db0; }
    .th-tag--success { background-color: #e6faf2; color: #006646; }
    .th-tag--warning { background-color: #fff8ec; color: #7a4d00; }
    .th-tag--danger  { background-color: #fef1f1; color: #a82020; }
    .th-tag--neutral { background-color: #f8f8f5; color: #5a5a58; }

    /* Footer */
    .th-footer { padding: 20px 32px 28px; border-top: 1px solid #f0f0ea; text-align: center; background-color: #f8f8f5; }
    .th-footer p { font-size: 12px; color: #9a9a96; margin: 0 0 6px; line-height: 1.6; }
    .th-footer p:last-child { margin-bottom: 0; }
    .th-footer a { color: #9a9a96; text-decoration: underline; }
    .th-footer-brand { font-size: 13px !important; font-weight: 600; color: #5a5a58 !important; margin-bottom: 8px !important; }
  </style>

  <!--[if mso]><table width="100%" bgcolor="#f2f1ed"><tr><td align="center" style="padding:24px 16px;"><table width="560" bgcolor="#ffffff"><tr><td><![endif]-->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2f1ed;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="560" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background-color:#ffffff;max-width:560px;width:100%;border-radius:12px;">
          <tr>
            <td>
              __CONTENT__
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  <!--[if mso]></td></tr></table></td></tr></table><![endif]-->
</body>
</html>`;

/**
 * Wraps an email body HTML (a th-wrap div) in the full HTML email wrapper
 * that includes the doctype, head, and body-scoped styles.
 */
export function wrapEmailHtml(bodyHtml: string): string {
  return WRAPPER_TEMPLATE.replace('__CONTENT__', bodyHtml);
}
