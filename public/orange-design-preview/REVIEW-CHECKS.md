# Checks performed on the recovered and continued orange preview

28 September 2026. These results replace earlier preview test claims.

- Source renderer: all 59 page/state functions rendered; their local asset references and internal navigation targets resolved.
- Browser: opened all 59 options in the hosted review selector, checked non-empty page content and titles, no observed failed image elements, and no content width above the 1440px desktop canvas. No application console errors were returned by the deployment-URL filter.
- Visually compared the public homepage, customer dashboard, transporter dashboard, admin dashboard, customer login, available jobs and collection report with the four approved reference boards. Photography is reconstructed, not an exact extraction of hidden original layers.
- Homepage expansion: measured hero height and how-it-works document position before and after expansion. Both were unchanged (563.17px rendered hero height; lower section at 966.92px in the browser's fit view).
- Van + Enclosed displayed the compatibility warning and retained Van. Calendar bounds were 220.80–715.19px within a 936px-high browser viewport. Selected 18 October and confirmed the date persisted.
- Login mode removed create-only name/phone controls. Incomplete submit displayed the missing-fields message.
- Job Vehicle type=Van returned one example request; Clear Filters restored three.
- Collection condition=Existing damage present revealed the damage-notes field.
- Typed and sent an example message; it appeared as a local bubble. No real message was sent.
- Legal source comparison: all 17 Terms paragraphs and all 13 Privacy paragraphs matched the current application text.
- Preview source contains no fetch, XMLHttpRequest or sendBeacon call. No backend workflows were exercised.

The source renderer is a minimal DOM check, not a substitute for the browser checks. The browser review used a fixed 1440px desktop design canvas fitted to its viewport; it does not establish responsive implementation at every future application width. Real account, payment, upload and delivery integrations remain gated by later implementation and testing.
