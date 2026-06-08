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
];
