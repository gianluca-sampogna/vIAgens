import Image from "next/image";
import HeroImage from '@/public/assets/aviao.svg'
import style from './style.module.css'

export default function Home() {
  return (
    <div className={style.container}>
        <div className={style.conteudo}>
          <div className={style.imagemContainer}>
            <Image 
              alt="Foto ilustrativa"
              src={HeroImage}
              className={style.image}
              priority

              />
          </div>

          <div className={style.secaoTexto}>
            <h1 className={style.textoPrincipal}>Sistema feito para você planejar <br/> suas viagens</h1>
          
            <div className={style.botoes}>
              <div className={style.botao}><p className={style.textoBtn}>+ 7 mil posts</p></div>
              <div className={style.botao}><p className={style.textoBtn}>+ mil comentários</p></div>
            </div>
          </div>


        </div>
    </div>
  );
}
