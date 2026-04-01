"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type PercentField = "" | "0" | "25" | "50" | "75" | "100";

type FormState = {
  inputRenewable: PercentField;
  inputPackaging: PercentField;
  outputOrganicReuse: PercentField;
  waterEffluents: PercentField;
  reusablePackaging: PercentField;
  coldChainTransport: PercentField;
  shelfLifeDays: string;
  portionFormat: PercentField;
  outputPackagingReturn: PercentField;
  byproductYield: PercentField;
};

type ScoreCard = {
  label: string;
  value: number;
  description: string;
  color: string;
};

const percentChoices: Array<{ label: string; value: Exclude<PercentField, ""> }> = [
  { label: "0%", value: "0" },
  { label: "1-25%", value: "25" },
  { label: "26-50%", value: "50" },
  { label: "51-75%", value: "75" },
  { label: "76-100%", value: "100" },
];

const initialFormState: FormState = {
  inputRenewable: "",
  inputPackaging: "",
  outputOrganicReuse: "",
  waterEffluents: "",
  reusablePackaging: "",
  coldChainTransport: "",
  shelfLifeDays: "",
  portionFormat: "",
  outputPackagingReturn: "",
  byproductYield: "",
};

const topicMeta = [
  {
    id: "inflow",
    title: "1. Entrada Circular",
    subtitle: "Mede a origem sustentável dos insumos e das embalagens industriais.",
  },
  {
    id: "waste",
    title: "2. Gestão de Resíduos e Água",
    subtitle: "Mede a eficiência no tratamento de efluentes e reaproveitamento de orgânicos.",
  },
  {
    id: "distribution",
    title: "3. Logística e Distribuição",
    subtitle: "Mede o transporte eficiente, cadeia de frio e embalagens expedidas.",
  },
  {
    id: "life",
    title: "4. Vida do Produto",
    subtitle: "Mede o tempo de prateleira (shelf-life) e formatos de consumo sustentáveis.",
  },
  {
    id: "monitoring",
    title: "5. Monitoramento e Pós-Consumo",
    subtitle: "Mede o retorno de embalagens e a transformação de perdas em coprodutos.",
  },
] as const;

function percentValue(value: PercentField) {
  return Number(value || 0);
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((acc, current) => acc + current, 0) / values.length);
}

function shelfLifeScore(daysText: string) {
  const days = Number(daysText);
  if (!Number.isFinite(days) || days <= 0) return 0;
  const cappedDays = Math.min(days, 90);
  return Math.round((cappedDays / 90) * 100);
}

function ScoreButtonGroup({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: PercentField;
  onChange: (value: PercentField) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {percentChoices.map((choice) => {
          const active = value === choice.value;
          return (
            <button
              key={choice.value}
              type="button"
              onClick={() => onChange(choice.value)}
              className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                active
                  ? "border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-[1.01]"
                  : "border-gray-100 bg-gray-50 text-gray-600 hover:border-primary/30 hover:bg-white"
              }`}
            >
              {choice.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NumberQuestion({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-xs font-black text-gray-400 uppercase tracking-wider ml-1">{label}</label>
        <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
      </div>
      <input
        type="number"
        min="0"
        max="3650"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ex: 12"
        className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
      />
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-black text-gray-800">{title}</h2>
        <p className="text-sm text-gray-600 leading-relaxed">{subtitle}</p>
      </div>
      <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-6">{children}</div>
    </div>
  );
}

export default function CircularidadeApp() {
  const [step, setStep] = useState(0);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const canContinueStep = (() => {
    switch (step) {
      case 2:
        return formData.inputRenewable !== "" && formData.inputPackaging !== "";
      case 3:
        return formData.outputOrganicReuse !== "" && formData.waterEffluents !== "";
      case 4:
        return formData.reusablePackaging !== "" && formData.coldChainTransport !== "";
      case 5:
        return formData.shelfLifeDays.trim() !== "" && formData.portionFormat !== "";
      case 6:
        return formData.outputPackagingReturn !== "" && formData.byproductYield !== "";
      default:
        return true;
    }
  })();

  const scores = (() => {
    const inflow = average([percentValue(formData.inputRenewable), percentValue(formData.inputPackaging)]);
    const waste = average([percentValue(formData.outputOrganicReuse), percentValue(formData.waterEffluents)]);
    const distribution = average([percentValue(formData.reusablePackaging), percentValue(formData.coldChainTransport)]);
    const life = average([shelfLifeScore(formData.shelfLifeDays), percentValue(formData.portionFormat)]);
    const monitoring = average([percentValue(formData.outputPackagingReturn), percentValue(formData.byproductYield)]);
    const overall = average([inflow, waste, distribution, life, monitoring]);

    const level =
      overall >= 80
        ? {
            title: "Circularidade avançada",
            description: "O negócio já demonstra práticas consistentes de circularidade em várias frentes.",
          }
        : overall >= 60
          ? {
              title: "Circularidade consistente",
              description: "Há boas práticas implantadas, com espaço claro para aumentar reaproveitamento e eficiência.",
            }
          : overall >= 40
            ? {
                title: "Circularidade em evolução",
                description: "O negócio já possui sinais de circularidade, mas ainda depende de melhorias estruturais.",
              }
            : {
                title: "Circularidade inicial",
                description: "O potencial de melhoria é alto e começa por ganhos simples de insumos, perdas e reaproveitamento.",
              };

    const cards: ScoreCard[] = [
      { label: topicMeta[0].title, value: inflow, description: topicMeta[0].subtitle, color: "#16A34A" },
      { label: topicMeta[1].title, value: waste, description: topicMeta[1].subtitle, color: "#F97316" },
      { label: topicMeta[2].title, value: distribution, description: topicMeta[2].subtitle, color: "#0EA5E9" },
      { label: topicMeta[3].title, value: life, description: topicMeta[3].subtitle, color: "#7C3AED" },
      { label: topicMeta[4].title, value: monitoring, description: topicMeta[4].subtitle, color: "#111827" },
    ];

    return { inflow, waste, distribution, life, monitoring, overall, level, cards };
  })();

  const progress = step <= 1 ? 0 : step === 7 ? 100 : ((step - 1) / 5) * 100;

  const nextStep = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (step === 1 && !acceptedTerms) return;
    if (step >= 2 && step <= 6 && !canContinueStep) return;
    setStep((current) => Math.min(current + 1, 7));
  };

  const prevStep = () => setStep((current) => Math.max(current - 1, 0));

  const resetForm = () => {
    setStep(0);
    setAcceptedTerms(false);
    setFormData(initialFormState);
  };

  const currentTopic = step >= 2 && step <= 6 ? topicMeta[step - 2] : null;

  return (
    <main className="max-w-md mx-auto min-h-screen py-8 px-4 flex flex-col items-center justify-center font-sans tracking-tight relative">
      {step === 0 && (
        <div className="w-full text-center space-y-8 animate-fade-in">
          <header className="w-full pt-2 flex items-center justify-center">
            <Image src="/cosmob.png" alt="Cosmob" width={280} height={80} priority className="h-20 w-auto" />
          </header>

          <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse" />
            <div className="bg-white rounded-full p-8 shadow-xl relative z-10 dairy-shadow">
              <svg viewBox="0 0 24 24" className="w-20 h-20 text-primary" fill="currentColor">
                <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
              </svg>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-black text-gray-800 leading-tight">
              Diagnóstico de Circularidade
              <br />
              Alimentos e Agroindústria
            </h1>
            <p className="text-gray-500 font-medium max-w-xs mx-auto text-balance">
              Métrica executiva baseada na ISO 59020 para avaliar a circularidade em 5 etapas operacionais: insumos, gestão de resíduos e efluentes, logística eficiente, vida do produto e logística reversa.
            </p>
          </div>

          <button
            onClick={nextStep}
            className="w-full bg-primary text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all glow-primary"
          >
            Iniciar Diagnóstico
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="w-full space-y-6 animate-fade-in">
          <header className="w-full pt-2 flex items-center justify-center">
            <Image src="/cosmob.png" alt="Cosmob" width={280} height={80} priority className="h-20 w-auto" />
          </header>

          <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-5 text-left">
            <h1 className="text-xl font-black text-gray-800 tracking-tight">TERMOS DE USO</h1>

            <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
              <div className="space-y-1">
                <div className="font-bold">1. Finalidade</div>
                <div>Este diagnóstico tem finalidade orientativa e não substitui auditoria, certificação ou validação técnica formal.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">2. Base Metodológica</div>
                <div>O formulário foi estruturado a partir dos cinco tópicos da ISO 59020, adaptado para pequenos negócios de alimentos e agroindústria.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">3. Uso dos Dados</div>
                <div>As respostas devem refletir a situação média dos últimos 12 meses para permitir uma métrica mais estável de circularidade.</div>
              </div>
            </div>

            <label className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 h-5 w-5 accent-primary"
              />
              <span className="text-xs font-bold text-gray-700 leading-relaxed">
                Li e aceito os termos acima. Entendo que o resultado é um diagnóstico de circularidade para uso interno e comparativo.
              </span>
            </label>

            <button
              onClick={nextStep}
              disabled={!acceptedTerms}
              className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${
                acceptedTerms ? "bg-primary text-white hover:scale-[1.01]" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {step > 1 && step < 7 && currentTopic && (
        <div className="w-full space-y-6 animate-fade-in">
          <div className="w-full space-y-2">
            <div className="flex justify-between items-end">
              <div className="px-3 py-1 bg-primary/10 rounded-full">
                <span className="text-[10px] font-black text-primary tracking-widest uppercase">Tópico {step - 1} de 5</span>
              </div>
              <span className="text-2xl font-black text-gray-800 tracking-tighter">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <SectionCard title={currentTopic.title} subtitle={currentTopic.subtitle}>
            {step === 2 && (
              <div className="space-y-6">
                <ScoreButtonGroup
                  label="1. Insumos sustentáveis"
                  description="Nos últimos 12 meses, qual percentual dos insumos produtivos foi de origem renovável, certificada ou reaproveitada?"
                  value={formData.inputRenewable}
                  onChange={(value) => updateField("inputRenewable", value)}
                />
                <ScoreButtonGroup
                  label="2. Embalagens de entrada"
                  description="Nos últimos 12 meses, qual percentual das embalagens utilizadas nesses insumos foi retornável, reutilizável ou reciclável?"
                  value={formData.inputPackaging}
                  onChange={(value) => updateField("inputPackaging", value)}
                />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <ScoreButtonGroup
                  label="3. Resíduos orgânicos"
                  description="Nos últimos 12 meses, qual percentual dos resíduos gerados foi reaproveitado, compostado ou virou biodigestão (evitando aterros)?"
                  value={formData.outputOrganicReuse}
                  onChange={(value) => updateField("outputOrganicReuse", value)}
                />
                <ScoreButtonGroup
                  label="4. Água e Efluentes"
                  description="Da água residual gerada na indústria, qual percentual recebe tratamento adequado eficiente ou é destinada para reúso?"
                  value={formData.waterEffluents}
                  onChange={(value) => updateField("waterEffluents", value)}
                />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-6">
                <ScoreButtonGroup
                  label="5. Embalagens expedidas"
                  description="Nos últimos 12 meses, qual percentual das embalagens vendidas (saída) foi de materiais recicláveis, reutilizáveis ou compostáveis?"
                  value={formData.reusablePackaging}
                  onChange={(value) => updateField("reusablePackaging", value)}
                />
                <ScoreButtonGroup
                  label="6. Operação e Cadeia de Frio"
                  description="Qual percentual da sua distribuição utiliza transporte de baixa emissão ou cadeia de frio eficiente para reduzir quebras/perdas logísticas?"
                  value={formData.coldChainTransport}
                  onChange={(value) => updateField("coldChainTransport", value)}
                />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-6">
                <NumberQuestion
                  label="7. Longevidade (Shelf life)"
                  description="Em média, quantos dias o produto permanece apto para consumo após a fabricação, garantindo a sua estabilidade e qualidade?"
                  value={formData.shelfLifeDays}
                  onChange={(value) => updateField("shelfLifeDays", value)}
                />
                <ScoreButtonGroup
                  label="8. Formatos e Porções"
                  description="Qual percentual das vendas foi feito em porções ou embalagens que preveem o tempo de uso e reduzem a sobra no consumidor?"
                  value={formData.portionFormat}
                  onChange={(value) => updateField("portionFormat", value)}
                />
              </div>
            )}

            {step === 6 && (
              <div className="space-y-6">
                <ScoreButtonGroup
                  label="9. Retorno pós-consumo"
                  description="Nos últimos 12 meses, qual a taxa (percentual) de embalagens que efetivamente retornou por logística reversa, feedback ou foi reciclada?"
                  value={formData.outputPackagingReturn}
                  onChange={(value) => updateField("outputPackagingReturn", value)}
                />
                <ScoreButtonGroup
                  label="10. Coprodutos e Biomassa"
                  description="Qual percentual das perdas/sobras da matéria-prima (que não virou o produto principal) foi transformado em coprodutos valorizados, biomassa ou energia?"
                  value={formData.byproductYield}
                  onChange={(value) => updateField("byproductYield", value)}
                />
              </div>
            )}
          </SectionCard>

          <div className="flex gap-4 pt-2">
            <button
              onClick={prevStep}
              className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all"
            >
              Voltar
            </button>
            <button
              onClick={nextStep}
              disabled={!canContinueStep}
              className={`flex-[2] py-4 px-6 rounded-2xl font-bold shadow-lg transition-all ${
                canContinueStep ? "bg-primary text-white hover:scale-[1.01]" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              {step === 6 ? "Ver Resultado" : "Continuar"}
            </button>
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="w-full space-y-8 animate-fade-in text-center">
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-primary tracking-widest uppercase">Resultado do Diagnóstico</h2>
            <h1 className="text-3xl font-extrabold text-gray-800">ISO 59020</h1>
          </div>

          <div className="relative w-64 h-64 mx-auto flex items-center justify-center bg-white rounded-[40px] dairy-shadow">
            <svg className="w-48 h-48 transform -rotate-90 scale-x-[-1]">
              <circle cx="96" cy="96" r="80" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-secondary/10" />
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 80}
                strokeDashoffset={2 * Math.PI * 80 * (1 - scores.overall / 100)}
                strokeLinecap="round"
                className="text-secondary transition-all duration-1000 ease-out"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-black text-secondary tracking-tighter">{scores.overall}%</span>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Score de Circularidade</p>
            </div>

            <div className="absolute inset-0 rounded-[40px] ring-1 ring-secondary/20 pointer-events-none" />
          </div>

          <div className="bg-secondary/10 p-6 rounded-3xl border border-secondary/20 relative overflow-hidden group text-left">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
              <svg className="w-12 h-12 text-secondary" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z" />
              </svg>
            </div>
            <p className="text-secondary font-black text-xl mb-1">{scores.level.title}</p>
            <p className="text-sm text-secondary/70 font-medium">{scores.level.description}</p>
          </div>

          <div className="w-full space-y-4 pt-2 text-left">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Indicadores Detalhados</h3>
            </div>

            <div className="space-y-4">
              {scores.cards.map((item) => (
                <div key={item.label} className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white dairy-shadow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-gray-700">{item.label}</span>
                    <span className="text-sm font-black text-gray-800">{item.value}%</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                  <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full transition-all duration-1000 ease-out delay-500" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full space-y-4 pt-4 text-left">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 bg-secondary/20 rounded-lg text-secondary">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 21h22L12 2zm0 3.45L20.14 19H3.86L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z" />
                </svg>
              </div>
              <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Leituras práticas</h3>
            </div>

            <div className="grid gap-3">
              {[
                {
                  title: "Reduzir perdas",
                  tip: "Use os indicadores de longevidade e balanço de massa para atacar desperdícios e validade.",
                },
                {
                  title: "Aproveitar subprodutos",
                  tip: "Mapeie resíduos orgânicos e coprodutos que possam virar ração, composto ou insumo secundário.",
                },
                {
                  title: "Melhorar embalagem",
                  tip: "Priorize formatos retornáveis, recicláveis e porções que reduzam sobras no consumo.",
                },
              ].map((item) => (
                <div key={item.title} className="bg-white p-4 rounded-2xl border-l-4 border-secondary shadow-sm">
                  <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                  <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.tip}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <button
              onClick={resetForm}
              className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8 8 0 104.582 9m0 0H9m11 11v-5h-.581m0 0A8 8 0 018.643 7"
                />
              </svg>
              Novo Diagnóstico
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
