/**
 * Localized email templates (subset) for Qlisted. Falls back to English when a
 * locale isn't translated. RTL for Arabic. The monolith owns the full set in
 * server/src/services/emailService — port the rest here during extraction.
 */

type Tpl = { subject: string; title: string; body: string; btn: string };
type Dict = {
  verify: Tpl;
  reset: Tpl;
  adminInvite: Tpl;
  orderReady: Tpl;
};

const en: Dict = {
  verify: { subject: "Verify your Qlisted email", title: "Confirm your email", body: "Welcome! Confirm your email to secure your Qlisted account.", btn: "Verify email" },
  reset: { subject: "Reset your Qlisted password", title: "Reset your password", body: "We received a request to reset your password.", btn: "Choose a new password" },
  adminInvite: { subject: "Set your Qlisted password", title: "You've been added to a restaurant", body: "Set your password to access the Qlisted dashboard.", btn: "Set password" },
  orderReady: { subject: "Your order is ready", title: "Order ready", body: "Your order is ready — please collect it.", btn: "View order" },
};
const es: Dict = {
  verify: { subject: "Verifica tu correo de Qlisted", title: "Confirma tu correo", body: "¡Bienvenido! Confirma tu correo para proteger tu cuenta.", btn: "Verificar correo" },
  reset: { subject: "Restablece tu contraseña de Qlisted", title: "Restablece tu contraseña", body: "Recibimos una solicitud para restablecer tu contraseña.", btn: "Elegir nueva contraseña" },
  adminInvite: { subject: "Configura tu contraseña de Qlisted", title: "Se te ha añadido a un restaurante", body: "Configura tu contraseña para acceder al panel.", btn: "Configurar contraseña" },
  orderReady: { subject: "Tu pedido está listo", title: "Pedido listo", body: "Tu pedido está listo — pásate a recogerlo.", btn: "Ver pedido" },
};
const ar: Dict = {
  verify: { subject: "تأكيد بريدك في Qlisted", title: "أكّد بريدك الإلكتروني", body: "مرحبًا! أكّد بريدك لتأمين حسابك.", btn: "تأكيد البريد" },
  reset: { subject: "إعادة تعيين كلمة مرور Qlisted", title: "إعادة تعيين كلمة المرور", body: "تلقّينا طلبًا لإعادة تعيين كلمة مرورك.", btn: "اختر كلمة مرور جديدة" },
  adminInvite: { subject: "تعيين كلمة مرور Qlisted", title: "تمت إضافتك إلى مطعم", body: "عيّن كلمة المرور للوصول إلى اللوحة.", btn: "تعيين كلمة المرور" },
  orderReady: { subject: "طلبك جاهز", title: "الطلب جاهز", body: "طلبك جاهز — يُرجى استلامه.", btn: "عرض الطلب" },
};

const DICTS: Record<string, Dict> = { en, es, ar };

function layout(title: string, body: string, dir: "ltr" | "rtl") {
  return `<!doctype html><html dir="${dir}"><body style="font-family:system-ui,sans-serif;background:#faf7f2;color:#3a2a1a;padding:24px">
  <div style="max-width:520px;margin:auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #efe7dc">
  <h1 style="color:#8B4513;font-size:20px">${title}</h1>${body}
  <p style="color:#9a8a78;font-size:12px;margin-top:24px">Qlisted · QR ordering for restaurants</p></div></body></html>`;
}

export function renderEmail(
  template: keyof Dict,
  locale: string | undefined,
  vars: Record<string, unknown>,
): { subject: string; html: string } {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const d = DICTS[locale ?? "en"] ?? en;
  const tpl = d[template] ?? en[template];
  const url = String(vars.url ?? "#");
  const btn = `<a href="${url}" style="display:inline-block;margin-top:16px;background:#8B4513;color:#fff;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">${tpl.btn}</a>`;
  return { subject: tpl.subject, html: layout(tpl.title, `<p style="color:#5c4a38">${tpl.body}</p>${btn}`, dir) };
}
