import { NextResponse } from "next/server";

type EmpresaquiNormalized = {
  cnpj: string;
  razaoSocial?: string;
  cidade?: string;
  estado?: string;
  celular?: string;
  email?: string;
  socioNome?: string;
};

const pickFirstString = (values: unknown[]) => {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
};

const isValidCnpj = (value: string) => {
  const cnpj = value.replace(/\D/g, "");
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const sum1 = weights1.reduce((acc, w, i) => acc + digits[i] * w, 0);
  const mod1 = sum1 % 11;
  const check1 = mod1 < 2 ? 0 : 11 - mod1;
  if (digits[12] !== check1) return false;

  const sum2 = weights2.reduce((acc, w, i) => acc + digits[i] * w, 0);
  const mod2 = sum2 % 11;
  const check2 = mod2 < 2 ? 0 : 11 - mod2;
  if (digits[13] !== check2) return false;

  return true;
};

const pickFirstArrayString = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;
  return pickFirstString(value);
};

const pickFromObject = (obj: unknown, keys: string[]) => {
  if (!obj || typeof obj !== "object") return undefined;
  const record = obj as Record<string, unknown>;
  return pickFirstString(keys.map((k) => record[k]));
};

const asRecord = (value: unknown) => {
  if (value && typeof value === "object") return value as Record<string, unknown>;
  return undefined;
};

const buildPhone = (ddd: unknown, tel: unknown) => {
  const d = typeof ddd === "string" ? ddd.replace(/\D/g, "") : "";
  const t = typeof tel === "string" ? tel.replace(/\D/g, "") : "";
  if (!d && !t) return undefined;
  if (!d) return t || undefined;
  if (!t) return d || undefined;
  return `(${d}) ${t}`;
};

const pickSocioNome = (record: Record<string, unknown> | undefined) => {
  const fromArray = pickFirstArrayString(record?.socios_nome);
  if (fromArray) return fromArray;

  const numericKeys = Object.keys(record ?? {}).filter((k) => /^\d+$/.test(k)).sort((a, b) => Number(a) - Number(b));
  for (const k of numericKeys) {
    const socio = asRecord(record?.[k]);
    const nome = pickFromObject(socio, ["socios_nome", "nome"]);
    if (nome) return nome;
  }

  return undefined;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const cnpj = (searchParams.get("cnpj") ?? "").replace(/\D/g, "");

  if (!isValidCnpj(cnpj)) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  const urlTemplate = process.env.EMPRESAQUI_CNPJ_URL_TEMPLATE;
  const token = process.env.EMPRESAQUI_API_TOKEN;
  const tokenHeader = process.env.EMPRESAQUI_API_TOKEN_HEADER || "Authorization";
  const tokenPrefix = process.env.EMPRESAQUI_API_TOKEN_PREFIX || "Bearer ";

  const effectiveTemplate = urlTemplate || "https://www.empresaqui.com.br/api/{token}/{cnpj};";
  if (effectiveTemplate.includes("{token}") && !token) {
    return NextResponse.json(
      {
        error: "Integração com a Empresaqui não configurada (defina EMPRESAQUI_API_TOKEN).",
      },
      { status: 501 },
    );
  }

  const url = effectiveTemplate.replace("{cnpj}", cnpj).replace("{token}", encodeURIComponent(token ?? ""));
  const maskedUrl = token ? url.replaceAll(token, "****") : url;
  const headers: Record<string, string> = {};
  if (token) headers[tokenHeader] = `${tokenPrefix}${token}`;

  let raw: unknown;
  let responseStatus = 0;
  try {
    let res = await fetch(url, { headers, cache: "no-store" });
    if (res.status === 404 && url.endsWith(";")) {
      res = await fetch(url.slice(0, -1), { headers, cache: "no-store" });
    }
    responseStatus = res.status;
    const text = await res.text();
    try {
      raw = text ? JSON.parse(text) : {};
    } catch {
      raw = { raw: text };
    }

    if (!res.ok) {
      const rawText = pickFromObject(raw, ["raw"]);
      const rawSnippet = rawText ? rawText.trim().slice(0, 300) : undefined;
      const looksLikeHtml = typeof rawText === "string" && /<html|<!doctype html/i.test(rawText);
      const errorMessage = looksLikeHtml
        ? responseStatus === 404
          ? "CNPJ não encontrado na base da EmpresaAqui"
          : "Falha na consulta da EmpresaAqui"
        : pickFirstString([
            pickFromObject(raw, ["message", "error", "detail"]),
            rawSnippet,
            "Falha na consulta da Empresaqui",
          ]);
      return NextResponse.json(
        { error: errorMessage, providerStatus: responseStatus, providerUrl: maskedUrl },
        { status: res.status },
      );
    }
  } catch {
    return NextResponse.json({ error: "Falha ao conectar na Empresaqui" }, { status: 502 });
  }

  const obj = raw as unknown;
  const record = asRecord(obj);
  const normalized: EmpresaquiNormalized = {
    cnpj,
    razaoSocial: pickFirstString([
      pickFromObject(obj, ["razao", "razaoSocial", "razao_social", "nome", "nomeEmpresa", "fantasia"]),
    ]),
    cidade: pickFirstString([
      pickFromObject(obj, ["log_municipio", "cidade", "municipio"]),
    ]),
    estado: pickFirstString([
      pickFromObject(obj, ["log_uf", "uf", "estado"]),
    ]),
    celular: pickFirstString([
      buildPhone(record?.ddd_1, record?.tel_1),
      buildPhone(record?.ddd_2, record?.tel_2),
    ]),
    email: pickFirstString([
      pickFromObject(obj, ["email"]),
    ]),
    socioNome: pickFirstString([
      pickSocioNome(record),
    ]),
  };

  return NextResponse.json(normalized);
}
