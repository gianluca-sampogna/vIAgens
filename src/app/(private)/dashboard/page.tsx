import { Plus, Clock, LayoutGrid, List, MoreVertical, FileText } from 'lucide-react'
import style from './style.module.css'

interface Viagem {
  nome: string
  dsc_viagem: string
  accentColor: string
  sources: number
  updatedAt: string
}

const mock_viagens: Viagem[] = [
  {
    nome: 'Viagem para o Japão',
    dsc_viagem: 'Analysis of major LLM alignment protocols, policy briefs, and computational resource allocation reports.',
    accentColor: '#3B82F6',
    sources: 8,
    updatedAt: 'Opened 2 hours ago'
  },
  {
    nome: 'Viagem para Domingos martins',
    dsc_viagem: 'Synthesis of user feedback channels, priority features list, design system updates, and launch timelines.',
    accentColor: '#A855F7',
    sources: 4,
    updatedAt: 'Edited yesterday'
  },
  
]

export default function Dashboard() {
  return (
    <div className={style.container}>
      <section className={style.principal}>
        <h1 className={style.txtBemVindo}>Bem vindo ao vIAgens</h1>
        <h3 className={style.txtPersonalizador}>Seu personalizador de viagens. Planeje seu sonho com ajuda da IA.</h3>
        <div className={style.novaViagem}>
          <div className={style.iconPlus}>
            <Plus size={20} />
          </div>
          <p className={style.txtNewImage}>Nova Viagem</p>
          <p className={style.txtNewRoteiro}>Criar Novo Roteiro</p>
        </div>
      </section>
      
      <section className={style.secao_viagens}>
        <div className={style.viagensRecentesHeader}>
          <div className={style.viagensRecentesTitle}>
            <Clock size={20} className={style.clockIcon} />
            <h2 className={style.txtViagensRecentes}>Viagens recentes</h2>
          </div>
          {/* <div className={style.viewToggle}>
            <button className={`${style.viewBtn} ${style.activeView}`} aria-label="Visualização em grade">
              <LayoutGrid size={16} />
            </button>
            <button className={style.viewBtn} aria-label="Visualização em lista">
              <List size={16} />
            </button>
          </div> */}
        </div>

        <section className={style.cards}>
          {mock_viagens?.length > 0 &&
            mock_viagens.map((item, index) => (
              <div className={style.cardViagem} key={index}>
                <div 
                  className={style.accentBar} 
                  style={{ backgroundColor: item.accentColor }} 
                />
                <div className={style.cardBody}>
                  <div className={style.cardHeader}>
                    <h3 className={style.cardTitle}>{item.nome}</h3>
                    <button className={style.cardMenuBtn} aria-label="Opções">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                  <p className={style.cardDescription}>{item.dsc_viagem}</p>
                  <div className={style.cardFooter}>
                    <div className={style.sourceBadge}>
                      <FileText size={13} />
                      <span>{item.sources} sources</span>
                    </div>
                    <span className={style.cardTimestamp}>{item.updatedAt}</span>
                  </div>
                </div>
              </div>
            ))}
        </section>
      </section>
    </div>
  )
}
