export interface BlogPost {
  title: string;
  description: string;
  date: string;
  slug: string;
}

// Adicione um entry aqui ao criar um novo artigo em src/pages/blog/
export const posts: BlogPost[] = [
  {
    title: '5 ferramentas de IA que todo empreendedor brasileiro deveria conhecer em 2026',
    description: 'Descubra as 5 ferramentas de IA que estão transformando negócios brasileiros — do atendimento ao cliente até reuniões mais produtivas.',
    date: '2026-06-08',
    slug: '5-ferramentas-ia-empreendedor-brasileiro',
  },
  {
    title: 'ChatGPT vs Gemini vs Claude: qual usar na sua empresa em 2026?',
    description: 'Comparamos os três principais assistentes de IA para você escolher o melhor para o seu negócio. Veja pontos fortes, limitações e preços.',
    date: '2026-06-08',
    slug: 'chatgpt-vs-gemini-vs-claude',
  },
  {
    title: 'Como usar IA para atender clientes sem contratar mais pessoas',
    description: 'Descubra como usar IA no atendimento ao cliente da sua empresa — reduzindo tempo, custos e melhorando a experiência sem aumentar o time.',
    date: '2026-06-08',
    slug: 'ia-para-atendimento-ao-cliente',
  },
  {
    title: 'IA para pequenas empresas: por onde começar sem gastar muito',
    description: 'Guia prático para empreendedores brasileiros que querem usar IA sem complicação e sem investimento alto.',
    date: '2026-06-08',
    slug: 'ia-para-pequenas-empresas',
  },
];
