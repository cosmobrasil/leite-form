"use client";

import Image from 'next/image';
import { useState } from 'react';

type EmpresaquiCnpjResult = {
  cnpj: string;
  razaoSocial?: string;
  cidade?: string;
  estado?: string;
  celular?: string;
  email?: string;
  socioNome?: string;
};

export default function CircularidadeApp() {
  const [step, setStep] = useState(0); // 0: Inicial, 1: Termos, 2-6: Questionário, 7: Resultado
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [empresaquiStatus, setEmpresaquiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [empresaquiError, setEmpresaquiError] = useState<string | null>(null);
  const [manualBusinessInfo, setManualBusinessInfo] = useState(false);
  const initialFormData = {
    cnpj: '',
    nome: '',
    cidade: '',
    estado: '',
    celular: '',
    email: '',
    socioNome: '',
    tempo: '',
    pessoas: '',
    organizacao: '',
    atividade: 'Produção de leite cru',
    volume: '',
    origem: [] as string[],
    produto: '',
    importancia: '',
    comercializacao: '',
    embalagem: '',
    frequencia: '',
    rastreamento: '',
    inputOrigem: '',
    outputDestino: '',
  };

  type FormData = typeof initialFormData;

  const [formData, setFormData] = useState<FormData>(initialFormData);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    const p1 = digits.slice(0, 2);
    const p2 = digits.slice(2, 5);
    const p3 = digits.slice(5, 8);
    const p4 = digits.slice(8, 12);
    const p5 = digits.slice(12, 14);
    if (digits.length <= 2) return p1;
    if (digits.length <= 5) return `${p1}.${p2}`;
    if (digits.length <= 8) return `${p1}.${p2}.${p3}`;
    if (digits.length <= 12) return `${p1}.${p2}.${p3}/${p4}`;
    return `${p1}.${p2}.${p3}/${p4}-${p5}`;
  };

  const isValidCnpj = (value: string) => {
    const cnpj = value.replace(/\D/g, '');
    if (cnpj.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cnpj)) return false;

    const digits = cnpj.split('').map(Number);
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

  const lookupEmpresaquiByCnpj = async () => {
    const cnpj = formData.cnpj.replace(/\D/g, '');
    if (cnpj.length !== 14) return;
    if (!isValidCnpj(cnpj)) {
      setEmpresaquiStatus('error');
      setEmpresaquiError('CNPJ inválido. Verifique os dígitos e tente novamente.');
      return;
    }

    setEmpresaquiStatus('loading');
    setEmpresaquiError(null);

    try {
      const res = await fetch(`/api/empresaqui?cnpj=${encodeURIComponent(cnpj)}`);
      const data = (await res.json()) as EmpresaquiCnpjResult & { error?: string };

      if (!res.ok) throw new Error(data?.error || 'Falha ao consultar o CNPJ');

      setFormData(prev => ({
        ...prev,
        cnpj,
        nome: data.razaoSocial ?? prev.nome,
        cidade: data.cidade ?? prev.cidade,
        estado: data.estado ?? prev.estado,
        celular: data.celular ?? prev.celular,
        email: data.email ?? prev.email,
        socioNome: data.socioNome ?? prev.socioNome,
      }));
      setEmpresaquiStatus('success');
    } catch (e) {
      setEmpresaquiStatus('error');
      setEmpresaquiError(e instanceof Error ? e.message : 'Falha ao consultar o CNPJ');
    }
  };

  const nextStep = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    if (!acceptedTerms) return;
    if (step === 2 && empresaquiStatus !== 'success' && !manualBusinessInfo) return;
    setStep(s => s + 1);
  };
  const prevStep = () => setStep(s => s - 1);

  const questionnaireStep = step > 1 && step < 7 ? step - 1 : 0;
  const progress = step <= 1 ? 0 : step === 7 ? 100 : (questionnaireStep / 5) * 100;
  const canContinueQuestionnaire = step !== 2 || empresaquiStatus === 'success' || manualBusinessInfo;

  const indicadoresCalculados = (() => {
    type IndicatorItem = { label: string; value: number; color: string; weight: number };

    const pickScore = (value: string, map: Record<string, number>) => {
      if (!value) return null;
      const score = map[value];
      return Number.isFinite(score) ? score : null;
    };

    const candidates: IndicatorItem[] = [
      {
        label: 'Entrada de Insumos (Input)',
        value: pickScore(formData.inputOrigem, {
          'Insumo Virgem': 20,
          'Fonte Renovável': 80,
          'Insumo Reciclado': 70,
          'Insumo Reciclado Permanentemente': 100,
        }) ?? 0,
        color: '#16A34A',
        weight: 0.25,
      },
      {
        label: 'Saída de Insumos (Output)',
        value: pickScore(formData.outputDestino, {
          Aterro: 10,
          Reciclagem: 90,
          ValorizacaoEnergetica: 60,
        }) ?? 0,
        color: '#F97316',
        weight: 0.25,
      },
      {
        label: 'Rastreabilidade',
        value: pickScore(formData.rastreamento, {
          'Não é possível identificar': 10,
          'Identificação aproximada': 40,
          'Identificação por fornecedor': 70,
          'Identificação por lote': 100,
        }) ?? 0,
        color: '#0EA5E9',
        weight: 0.2,
      },
      {
        label: 'Embalagem',
        value: pickScore(formData.embalagem, {
          Industrial: 25,
          Simples: 45,
          'Sem embalagem': 75,
          Retornável: 100,
        }) ?? 0,
        color: '#7C3AED',
        weight: 0.15,
      },
      {
        label: 'Regularidade de produção',
        value: pickScore(formData.frequencia, {
          Sazonal: 40,
          Semanal: 60,
          Diária: 70,
          'Sob encomenda': 80,
        }) ?? 0,
        color: '#00AEEF',
        weight: 0.05,
      },
      {
        label: 'Escala (volume)',
        value: pickScore(formData.volume, {
          'Até 100L': 40,
          '100-500L': 55,
          '500-1000L': 70,
          '> 1000L': 85,
        }) ?? 0,
        color: '#111827',
        weight: 0.05,
      },
      {
        label: 'Maturidade do negócio',
        value: pickScore(formData.tempo, {
          '< 2 anos': 40,
          '2-5 anos': 55,
          '5-10 anos': 70,
          '> 10 anos': 80,
        }) ?? 0,
        color: '#4B5563',
        weight: 0.05,
      },
    ];

    const available = candidates.filter((c) => c.value > 0);
    const weightSum = available.reduce((acc, c) => acc + c.weight, 0);
    const score =
      weightSum > 0
        ? Math.round(available.reduce((acc, c) => acc + c.value * c.weight, 0) / weightSum)
        : 0;

    const level =
      score >= 70
        ? { title: 'Circularidade Avançada 🚀', desc: 'Seu negócio está no topo do ranking sustentável do setor.' }
        : score >= 40
          ? { title: 'Circularidade Intermediária', desc: 'Seu negócio já tem boas práticas e pode evoluir com ajustes.' }
          : { title: 'Circularidade Inicial', desc: 'Existe grande potencial de melhoria com ações simples.' };

    return {
      score,
      indicators: available
        .sort((a, b) => b.weight - a.weight)
        .map(({ label, value, color }) => ({ label, value, color })),
      level,
    };
  })();

  // Render components based on step
  return (
    <main className="max-w-md mx-auto min-h-screen py-8 px-4 flex flex-col items-center justify-center font-sans tracking-tight relative">
      
      {/* 1. Onboarding/Welcome */}
      {step === 0 && (
        <div className="w-full text-center space-y-8 animate-fade-in">
          <header className="w-full pt-2 flex items-center justify-center">
            <Image src="/cosmob.png" alt="Cosmob" width={280} height={80} priority className="h-20 w-auto" />
          </header>
          <div className="relative w-48 h-48 mx-auto mb-8 flex items-center justify-center">
             <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
             <div className="bg-white rounded-full p-8 shadow-xl relative z-10 dairy-shadow">
               <svg viewBox="0 0 24 24" className="w-20 h-20 text-primary" fill="currentColor">
                 <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z" />
               </svg>
             </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 leading-tight">
            Pré-Diagnóstico sobre Circularidade de Produtos 2.0 - 2026 <br />
            Setor Leiteiro
          </h1>
          <p className="text-gray-500 font-medium max-w-xs mx-auto text-balance">
            Avalie o nível de economia circular do seu laticínio em menos de 5 minutos.
          </p>
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
                <div className="font-bold">1. Limitações Legais</div>
                <div>Este pré-diagnóstico não possui valor legal e não pode ser utilizado como ferramenta de certificação formal. Os resultados não constituem certificação oficial nem garantem conformidade com regulamentações específicas.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">2. Finalidade</div>
                <div>A finalidade é orientar as empresas na identificação de possíveis melhorias em seus processos de produção e práticas empresariais, fornecendo insights para desenvolvimento sustentável.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">3. Base Metodológica</div>
                <div>O objetivo principal do pré-diagnóstico é medir o grau de circularidade de um produto, com base em indicadores internacionais. A fonte dos indicadores internacionais pertence ao Centro Tecnológico Cosmob localizado na Itália.</div>
              </div>

              <div className="space-y-1">
                <div className="font-bold">Privacidade dos Dados</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Os dados fornecidos são tratados com confidencialidade.</li>
                  <li>Informações da empresa não são compartilhadas individualmente.</li>
                  <li>Apenas dados agregados e anônimos são utilizados em análises.</li>
                  <li>Você pode solicitar a exclusão dos seus dados a qualquer momento.</li>
                </ul>
              </div>

              <div className="space-y-1">
                <div className="font-bold">Responsabilidades</div>
                <div>CosmoBrasil não se responsabiliza por decisões tomadas. Usuário deve validar informações com especialistas.</div>
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
                Declaro que li, compreendi e aceito todos os termos de uso acima descritos. Ao marcar esta opção, confirmo que entendo as limitações deste diagnóstico e que os resultados serão utilizados apenas para orientação interna da empresa.
              </span>
            </label>

            <button
              onClick={nextStep}
              disabled={!acceptedTerms}
              className={`w-full py-4 rounded-2xl font-bold shadow-lg transition-all ${
                acceptedTerms
                  ? 'bg-primary text-white hover:scale-[1.01]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continuar com o Questionário
            </button>
          </div>
        </div>
      )}

      {/* 2. Step Container (Progress Bar + Layout) */}
      {step > 1 && step < 7 && (
        <div className="w-full space-y-6 animate-fade-in">
          {/* Progress Header */}
          <div className="w-full space-y-2">
            <div className="flex justify-between items-end">
              <div className="px-3 py-1 bg-primary/10 rounded-full">
                <span className="text-[10px] font-black text-primary tracking-widest uppercase">Passo {questionnaireStep} de 5</span>
              </div>
              <span className="text-2xl font-black text-gray-800 tracking-tighter">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-700 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Business Identification */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                Identificação do Negócio
              </h2>
              <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">CNPJ</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCnpj(formData.cnpj)}
                      onChange={(e) => {
                        const cnpj = e.target.value.replace(/\D/g, '').slice(0, 14);
                        setEmpresaquiStatus('idle');
                        setEmpresaquiError(null);
                          setManualBusinessInfo(false);
                        setFormData(prev => ({
                          ...prev,
                          cnpj,
                          nome: '',
                          cidade: '',
                          estado: '',
                          celular: '',
                          email: '',
                          socioNome: '',
                        }));
                      }}
                      placeholder="00.000.000/0000-00"
                      className="flex-1 px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                    <button
                      type="button"
                      onClick={lookupEmpresaquiByCnpj}
                        disabled={manualBusinessInfo || empresaquiStatus === 'loading' || formData.cnpj.length !== 14 || !isValidCnpj(formData.cnpj)}
                      className={`px-4 py-4 rounded-2xl font-black text-sm transition-all ${
                          manualBusinessInfo || empresaquiStatus === 'loading' || formData.cnpj.length !== 14 || !isValidCnpj(formData.cnpj)
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-800 text-white hover:scale-[1.01]'
                      }`}
                    >
                      {empresaquiStatus === 'loading' ? 'Consultando...' : 'Consultar'}
                    </button>
                  </div>
                    <label className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4">
                      <input
                        type="checkbox"
                        checked={manualBusinessInfo}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setManualBusinessInfo(checked);
                          setEmpresaquiStatus('idle');
                          setEmpresaquiError(null);
                          if (checked) updateField('cnpj', '');
                        }}
                        className="mt-1 h-5 w-5 accent-primary"
                      />
                      <span className="text-xs font-bold text-gray-700 leading-relaxed">
                        Não sei meu CNPJ. Quero preencher os dados manualmente.
                      </span>
                    </label>
                    {!manualBusinessInfo && formData.cnpj.length === 14 && !isValidCnpj(formData.cnpj) && (
                      <div className="text-xs font-bold text-red-600">CNPJ inválido. Verifique os dígitos.</div>
                    )}
                  {empresaquiError && (
                    <div className="text-xs font-bold text-red-600">{empresaquiError}</div>
                  )}
                  {empresaquiStatus === 'success' && (
                    <div className="text-xs font-bold text-secondary">Dados preenchidos. Você pode corrigir se necessário.</div>
                  )}
                    {manualBusinessInfo && (
                      <div className="text-xs font-bold text-gray-600">
                        Você pode continuar preenchendo os campos abaixo manualmente.
                      </div>
                    )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome da Empresa</label>
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => updateField('nome', e.target.value)}
                    placeholder="Nome da empresa"
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.cidade}
                      onChange={(e) => updateField('cidade', e.target.value)}
                      placeholder="Cidade"
                      className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Estado (UF)</label>
                    <input
                      type="text"
                      value={formData.estado}
                      onChange={(e) => updateField('estado', e.target.value.toUpperCase())}
                      placeholder="UF"
                      maxLength={2}
                      className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium uppercase"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Celular</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={formData.celular}
                    onChange={(e) => updateField('celular', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">E-mail</label>
                  <input
                    type="email"
                    inputMode="email"
                    value={formData.email}
                    onChange={(e) => updateField('email', e.target.value)}
                    placeholder="email@empresa.com"
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Nome do Sócio</label>
                  <input
                    type="text"
                    value={formData.socioNome}
                    onChange={(e) => updateField('socioNome', e.target.value)}
                    placeholder="Nome do sócio"
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all font-medium"
                  />
                </div>
                <div className="space-y-4 pt-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Tempo de Funcionamento</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['< 2 anos', '2-5 anos', '5-10 anos', '> 10 anos'].map(option => (
                      <button 
                        key={option} 
                        onClick={() => updateField('tempo', option)}
                        className={`px-4 py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.tempo === option 
                          ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]' 
                          : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-primary/30'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Productive Profile */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                Perfil Produtivo
              </h2>
              <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Principal atividade</label>
                  <select 
                    value={formData.atividade}
                    onChange={(e) => updateField('atividade', e.target.value)}
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white outline-none transition-all font-bold text-gray-700 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSJncmF5Ij48cGF0aCBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIHN0cm9rZS13aWR0aD0iMiIgZD0iTTE5IDlsLTcgNy03LTciLz48L3N2Zz4=')] bg-[length:20px] bg-[right_1rem_center] bg-no-repeat"
                  >
                    <option>Produção de leite cru</option>
                    <option>Queijos</option>
                    <option>Manteiga</option>
                    <option>Iogurte</option>
                    <option>Vários derivados</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Volume médio de leite/dia</label>
                  <div className="grid grid-cols-2 gap-2">
                     {['Até 100L', '100-500L', '500-1000L', '> 1000L'].map(v => (
                       <button 
                        key={v} 
                        onClick={() => updateField('volume', v)}
                        className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.volume === v 
                          ? 'border-primary bg-primary text-white shadow-lg' 
                          : 'border-gray-50 bg-gray-50 text-gray-500'
                        }`}
                       >
                         {v}
                       </button>
                     ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                Produto e Características
              </h2>
              <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-6">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Produto analisado</label>
                  <input 
                    type="text" 
                    value={formData.produto}
                    onChange={(e) => updateField('produto', e.target.value)}
                    placeholder="Ex: Queijo Minas Artesanal" 
                    className="w-full px-4 py-4 rounded-2xl bg-gray-50 border-2 border-transparent focus:border-primary focus:bg-white outline-none transition-all font-medium" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Forma de embalagem</label>
                  <div className="grid grid-cols-2 gap-2">
                     {['Simples', 'Industrial', 'Retornável', 'Sem embalagem'].map(v => (
                       <button 
                         key={v} 
                         onClick={() => updateField('embalagem', v)}
                         className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                           formData.embalagem === v 
                           ? 'border-primary bg-primary text-white shadow-lg' 
                           : 'border-gray-50 bg-gray-50 text-gray-500'
                         }`}
                       >
                         {v}
                       </button>
                     ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Frequência de produção</label>
                  <div className="grid grid-cols-2 gap-2">
                     {['Diária', 'Semanal', 'Sazonal', 'Sob encomenda'].map(v => (
                       <button 
                        key={v} 
                        onClick={() => updateField('frequencia', v)}
                        className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.frequencia === v 
                          ? 'border-primary bg-primary text-white shadow-lg' 
                          : 'border-gray-50 bg-gray-50 text-gray-500'
                        }`}
                       >
                         {v}
                       </button>
                     ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                Rastreamento
              </h2>
              <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">É possível identificar a origem do leite?</label>
                  <div className="space-y-3">
                    {[
                      'Não é possível identificar',
                      'Identificação aproximada',
                      'Identificação por fornecedor',
                      'Identificação por lote'
                    ].map(option => (
                      <button 
                        key={option} 
                        onClick={() => updateField('rastreamento', option)}
                        className={`w-full px-5 py-5 text-left rounded-2xl border-2 transition-all flex items-center gap-4 ${
                          formData.rastreamento === option 
                          ? 'border-primary bg-primary/5 ring-4 ring-primary/5 shadow-md scale-[1.01]' 
                          : 'border-gray-50 bg-gray-50 text-gray-600'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                          formData.rastreamento === option ? 'border-primary bg-primary' : 'border-gray-200 bg-white'
                        }`}>
                          {formData.rastreamento === option && <div className="w-2 h-2 rounded-full bg-white animate-scale-in"></div>}
                        </div>
                        <span className={`text-sm font-bold ${formData.rastreamento === option ? 'text-primary' : 'text-gray-700'}`}>{option}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                Insumos (Input / Output)
              </h2>
              <div className="bg-white/80 backdrop-blur p-6 rounded-3xl dairy-shadow space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Entrada de Insumos (Input) proveniente de</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Fonte Renovável', 'Insumo Virgem', 'Insumo Reciclado', 'Insumo Reciclado Permanentemente'].map(option => (
                      <button
                        key={option}
                        onClick={() => updateField('inputOrigem', option)}
                        className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.inputOrigem === option
                            ? 'border-primary bg-primary text-white shadow-lg'
                            : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-primary/30'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Saída de Insumos (Output)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Aterro', 'Reciclagem', 'ValorizacaoEnergetica'].map(option => (
                      <button
                        key={option}
                        onClick={() => updateField('outputDestino', option)}
                        className={`py-4 rounded-2xl border-2 font-bold text-sm transition-all ${
                          formData.outputDestino === option
                            ? 'border-primary bg-primary text-white shadow-lg'
                            : 'border-gray-50 bg-gray-50 text-gray-500 hover:border-primary/30'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step Control Buttons */}
          <div className="flex gap-4 pt-4">
            <button onClick={prevStep} className="flex-1 py-4 px-6 rounded-2xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-all">Voltar</button>
            <button
              onClick={nextStep}
              disabled={!canContinueQuestionnaire}
              className={`flex-[2] py-4 px-6 rounded-2xl font-bold shadow-lg transition-all ${
                canContinueQuestionnaire
                  ? 'bg-primary text-white hover:scale-[1.01]'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* 3. Results Dashboard */}
      {step === 7 && (
        <div className="w-full space-y-8 animate-fade-in text-center">
           <div className="space-y-2">
             <h2 className="text-sm font-bold text-primary tracking-widest uppercase">Resultado do Diagnóstico</h2>
             <h1 className="text-3xl font-extrabold text-gray-800">CNAE 1052000</h1>
           </div>

           {/* Gráfico de Anel Premium em SVG */}
           <div className="relative w-64 h-64 mx-auto flex items-center justify-center bg-white rounded-[40px] dairy-shadow">
              <svg className="w-48 h-48 transform -rotate-90 scale-x-[-1]">
                {/* Background Circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-secondary/10"
                />
                {/* Progress Circle */}
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 80}
                  strokeDashoffset={(2 * Math.PI * 80) * (1 - (indicadoresCalculados.score / 100))}
                  strokeLinecap="round"
                  className="text-secondary transition-all duration-1000 ease-out"
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-black text-secondary tracking-tighter">{indicadoresCalculados.score}%</span>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Score Circular</p>
              </div>
              
              {/* Decorative Glow */}
              <div className="absolute inset-0 rounded-[40px] ring-1 ring-secondary/20 pointer-events-none"></div>
           </div>

           <div className="bg-secondary/10 p-6 rounded-3xl border border-secondary/20 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform">
                <svg className="w-12 h-12 text-secondary" fill="currentColor" viewBox="0 0 24 24"><path d="M12,2L4.5,20.29L5.21,21L12,18L18.79,21L19.5,20.29L12,2Z"/></svg>
              </div>
              <p className="text-secondary font-black text-xl mb-1">{indicadoresCalculados.level.title}</p>
              <p className="text-sm text-secondary/70 font-medium">{indicadoresCalculados.level.desc}</p>
           </div>

           {/* Seção de Indicadores Detalhados (do Design Google Stitch) */}
           <div className="w-full space-y-4 pt-2">
             <div className="flex justify-between items-center mb-1">
               <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Indicadores Detalhados</h3>
             </div>
             
             <div className="space-y-4">
              {indicadoresCalculados.indicators.map((item) => (
                 <div key={item.label} className="bg-white/50 backdrop-blur-sm p-4 rounded-2xl border border-white dairy-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-gray-700">{item.label}</span>
                      <span className="text-sm font-black text-gray-800">{item.value}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-1000 ease-out delay-500"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                 </div>
               ))}
             </div>
           </div>

           {/* Recomendações Práticas para Melhoria de Circularidade */}
           <div className="w-full space-y-4 pt-4 text-left">
             <div className="flex items-center gap-2 mb-2">
               <div className="p-1.5 bg-secondary/20 rounded-lg text-secondary">
                 <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.45L20.14 19H3.86L12 5.45zM11 16h2v2h-2v-2zm0-7h2v5h-2V9z"/></svg>
               </div>
               <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Dicas para Melhorar seu Score</h3>
             </div>

             <div className="grid gap-3">
               {[
                 { 
                   title: 'Reuso de Soro', 
                   tip: 'Transforme o soro em subprodutos (bebidas lácteas ou ricota) para reduzir o descarte.',
                   icon: '🍶'
                 },
                 { 
                   title: 'Embalagens Circulares', 
                   tip: 'Adote plásticos reciclados ou sistemas de logística reversa para suas embalagens.',
                   icon: '♻️'
                 },
                 { 
                   title: 'Energia Limpa', 
                   tip: 'Considere o uso de biogás a partir de resíduos orgânicos para alimentar a caldeira.',
                   icon: '⚡'
                 }
               ].map((item, idx) => (
                 <div key={idx} className="bg-white p-4 rounded-2xl border-l-4 border-secondary shadow-sm hover:shadow-md transition-shadow">
                   <div className="flex gap-3">
                     <span className="text-xl">{item.icon}</span>
                     <div>
                       <h4 className="text-sm font-bold text-gray-800">{item.title}</h4>
                       <p className="text-xs text-gray-500 leading-relaxed mt-0.5">{item.tip}</p>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           </div>

           <div className="space-y-4">
             <button className="w-full py-4 bg-gray-800 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
               Baixar Relatório Completo
             </button>
             <button
               onClick={() => {
                 setStep(0);
                 setAcceptedTerms(false);
                 setFormData(initialFormData);
                 setEmpresaquiStatus('idle');
                 setEmpresaquiError(null);
                 setManualBusinessInfo(false);
               }}
               className="text-gray-400 font-bold hover:text-primary transition-all"
             >
               Novo Diagnóstico
             </button>
           </div>
        </div>
      )}

    </main>
  );
}
