/**
 * Localized email templates (subset). Ported from the monolith's email-i18n.
 * Falls back to English when a locale isn't translated. RTL for Arabic.
 */

type Dict = {
  verify: { subject: string; title: string; body: string; btn: string };
  reset: { subject: string; title: string; body: string; btn: string };
  adminInvite: { subject: string; title: string; body: string; btn: string };
};

const en: Dict = {
  verify: { subject: "Verify your Escoutly email", title: "Confirm your email", body: "Welcome! Confirm your email to secure your Escoutly account.", btn: "Verify email" },
  reset: { subject: "Reset your Escoutly password", title: "Reset your password", body: "We received a request to reset your password.", btn: "Choose a new password" },
  adminInvite: { subject: "Set your Escoutly admin password", title: "You've been added as an admin", body: "Set your password to access the Escoutly staff console.", btn: "Set password" },
};
const es: Dict = {
  verify: { subject: "Verifica tu correo de Escoutly", title: "Confirma tu correo", body: "¡Bienvenido! Confirma tu correo para proteger tu cuenta.", btn: "Verificar correo" },
  reset: { subject: "Restablece tu contraseña de Escoutly", title: "Restablece tu contraseña", body: "Recibimos una solicitud para restablecer tu contraseña.", btn: "Elegir nueva contraseña" },
  adminInvite: { subject: "Configura tu contraseña de administrador", title: "Se te ha añadido como administrador", body: "Configura tu contraseña para acceder a la consola.", btn: "Configurar contraseña" },
};
const ar: Dict = {
  verify: { subject: "تأكيد بريدك في Escoutly", title: "أكّد بريدك الإلكتروني", body: "مرحبًا! أكّد بريدك لتأمين حسابك.", btn: "تأكيد البريد" },
  reset: { subject: "إعادة تعيين كلمة مرور Escoutly", title: "إعادة تعيين كلمة المرور", body: "تلقّينا طلبًا لإعادة تعيين كلمة مرورك.", btn: "اختر كلمة مرور جديدة" },
  adminInvite: { subject: "تعيين كلمة مرور المسؤول", title: "تمت إضافتك كمسؤول", body: "عيّن كلمة المرور للوصول إلى لوحة الموظفين.", btn: "تعيين كلمة المرور" },
};

const DICTS: Record<string, Dict> = { en, es, ar };

function layout(title: string, body: string, dir: "ltr" | "rtl") {
  return `<!doctype html><html dir="${dir}"><body style="font-family:system-ui,sans-serif;background:#0b1220;color:#e8eefc;padding:24px">
  <div style="max-width:520px;margin:auto;background:#101a30;border-radius:16px;padding:28px">
  <h1 style="color:#fbbf24;font-size:20px">${title}</h1>${body}
  <p style="color:#7e8aa3;font-size:12px;margin-top:24px">Escoutly · AI-powered real estate</p></div></body></html>`;
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
  const btn = `<a href="${url}" style="display:inline-block;margin-top:16px;background:linear-gradient(90deg,#f59e0b,#fbbf24);color:#080f1e;font-weight:700;padding:12px 20px;border-radius:12px;text-decoration:none">${tpl.btn}</a>`;
  return { subject: tpl.subject, html: layout(tpl.title, `<p style="color:#c7d2e6">${tpl.body}</p>${btn}`, dir) };
}
