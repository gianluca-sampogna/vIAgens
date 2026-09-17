"use client";

import { useEffect, useState, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { api, comToken } from "@/services/api";
import styles from "./style.module.css";
import {
  User,
  Mail,
  Shield,
  Calendar,
  DollarSign,
  Compass,
  Sun,
  Tag,
  LogOut,
  Save,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";

interface Preferencias {
  orcamentoReferencia: number | null;
  interessesPadrao: string[];
  estiloViagemPadrao: string | null;
  climaPreferido: string | null;
}

interface PerfilCompleto {
  id: string;
  nome: string;
  email: string;
  avatarUrl: string | null;
  papel: string;
  criadoEm: string;
  preferencias: Preferencias;
}

export default function PerfilPage() {
  const { data: session, status } = useSession();

  const [perfil, setPerfil] = useState<PerfilCompleto | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Campos editáveis
  const [nome, setNome] = useState("");
  const [orcamento, setOrcamento] = useState<string>("");
  const [estiloViagem, setEstiloViagem] = useState("");
  const [clima, setClima] = useState("");
  const [interesses, setInteresses] = useState<string[]>([]);
  const [novoInteresse, setNovoInteresse] = useState("");

  useEffect(() => {
    async function carregarPerfil() {
      if (status === "unauthenticated") return;
      if (!session?.backendToken) return;

      try {
        setCarregando(true);
        // Requisição HTTP via Axios para buscar o perfil completo do backend NestJS
        const { data } = await api.get<PerfilCompleto>(
          "/usuarios/eu",
          comToken(session.backendToken)
        );

        setPerfil(data);
        setNome(data.nome || "");
        setOrcamento(
          data.preferencias?.orcamentoReferencia != null
            ? String(data.preferencias.orcamentoReferencia)
            : ""
        );
        setEstiloViagem(data.preferencias?.estiloViagemPadrao || "");
        setClima(data.preferencias?.climaPreferido || "");
        setInteresses(data.preferencias?.interessesPadrao || []);
      } catch (erro) {
        console.error("Erro ao buscar perfil do usuário:", erro);
        setMensagemErro(
          "Não foi possível carregar suas informações do servidor."
        );
      } finally {
        setCarregando(false);
      }
    }

    carregarPerfil();
  }, [session, status]);

  function adicionarInteresse() {
    const limpo = novoInteresse.trim();
    if (!limpo) return;
    if (interesses.includes(limpo)) return;

    setInteresses((prev) => [...prev, limpo]);
    setNovoInteresse("");
  }

  function removerInteresse(tag: string) {
    setInteresses((prev) => prev.filter((i) => i !== tag));
  }

  async function aoSalvar(e: FormEvent) {
    e.preventDefault();
    setMensagemSucesso(null);
    setMensagemErro(null);

    if (!session?.backendToken) {
      setMensagemErro("Sessão não encontrada. Faça login novamente.");
      return;
    }

    try {
      setSalvando(true);

      const payload = {
        nome: nome.trim(),
        preferencias: {
          orcamentoReferencia: orcamento ? Number(orcamento) : undefined,
          interessesPadrao: interesses,
          estiloViagemPadrao: estiloViagem.trim() || undefined,
          climaPreferido: clima.trim() || undefined,
        },
      };

      // Requisição HTTP PATCH via Axios para atualizar perfil no NestJS
      const { data } = await api.patch<PerfilCompleto>(
        "/usuarios/eu",
        payload,
        comToken(session.backendToken)
      );

      setPerfil(data);
      setMensagemSucesso("Perfil e preferências atualizados com sucesso!");
    } catch (erro) {
      console.error("Erro ao atualizar perfil:", erro);
      setMensagemErro("Falha ao salvar as alterações. Verifique os dados.");
    } finally {
      setSalvando(false);
    }
  }

  if (status === "loading" || carregando) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Carregando perfil do usuário...</p>
      </div>
    );
  }

  const inicialNome =
    perfil?.nome?.charAt(0).toUpperCase() ||
    session?.user?.name?.charAt(0).toUpperCase() ||
    "U";

  const dataFormatada = perfil?.criadoEm
    ? new Date(perfil.criadoEm).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "Data não disponível";

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        {/* Header do Perfil com Ação de Logout */}
        <section className={styles.headerCard}>
          <div className={styles.userInfo}>
            {perfil?.avatarUrl ? (
              <img
                src={perfil.avatarUrl}
                alt={perfil.nome}
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatar}>{inicialNome}</div>
            )}
            <div className={styles.userMeta}>
              <div className={styles.userNameRow}>
                <h1 className={styles.userName}>{perfil?.nome || session?.user?.name}</h1>
                <span className={styles.userBadge}>
                  {perfil?.papel || "USER"}
                </span>
              </div>
              <p className={styles.userEmail}>
                <Mail size={16} /> {perfil?.email || session?.user?.email}
              </p>
              <span className={styles.createdDate}>
                Conta criada em: {dataFormatada}
              </span>
            </div>
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className={styles.signOutButton}
            title="Sair da sua conta"
          >
            <LogOut size={18} />
            <span>Sair da Conta</span>
          </button>
        </section>

        {/* Mensagens de Feedback */}
        {mensagemSucesso && (
          <div className={styles.feedbackSuccess}>
            <CheckCircle2 size={20} />
            <span>{mensagemSucesso}</span>
          </div>
        )}
        {mensagemErro && (
          <div className={styles.feedbackError}>
            <AlertCircle size={20} />
            <span>{mensagemErro}</span>
          </div>
        )}

        {/* Formulário de Perfil e Preferências */}
        <form onSubmit={aoSalvar} className={styles.gridContainer}>
          {/* Card 1: Dados Pessoais */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <User size={20} />
              <span>Informações Pessoais</span>
            </h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={styles.input}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>E-mail (Cadastrado)</label>
              <input
                type="email"
                value={perfil?.email || session?.user?.email || ""}
                disabled
                className={styles.input}
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Nível de Acesso (Papel)</label>
              <div className={styles.input} style={{ opacity: 0.6, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Shield size={16} />
                <span>{perfil?.papel || "USER"}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Preferências de Viagem */}
          <div className={styles.card}>
            <h2 className={styles.cardTitle}>
              <Compass size={20} />
              <span>Preferências de Viagem</span>
            </h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Orçamento de Referência (R$)</label>
              <div style={{ position: "relative" }}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={orcamento}
                  onChange={(e) => setOrcamento(e.target.value)}
                  className={styles.input}
                  placeholder="Ex: 5000.00"
                  style={{ width: "100%" }}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Estilo de Viagem Preferido</label>
              <input
                type="text"
                value={estiloViagem}
                onChange={(e) => setEstiloViagem(e.target.value)}
                className={styles.input}
                placeholder="Ex: Mochilão, Luxo, Ecoturismo, Família"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Clima Preferido</label>
              <input
                type="text"
                value={clima}
                onChange={(e) => setClima(e.target.value)}
                className={styles.input}
                placeholder="Ex: Ensolarado, Frio, Temperado"
              />
            </div>
          </div>

          {/* Card 3: Interesses e Tags (Largura total no grid) */}
          <div className={styles.card} style={{ gridColumn: "1 / -1" }}>
            <h2 className={styles.cardTitle}>
              <Tag size={20} />
              <span>Interesses Padrão para Viagens</span>
            </h2>

            <div className={styles.formGroup}>
              <label className={styles.label}>Adicionar Interesses (Ex: Gastronomia, Praias, Museus, Trilhas)</label>
              <div className={styles.addTagRow}>
                <input
                  type="text"
                  value={novoInteresse}
                  onChange={(e) => setNovoInteresse(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      adicionarInteresse();
                    }
                  }}
                  className={styles.input}
                  placeholder="Digite um interesse e clique em adicionar..."
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  onClick={adicionarInteresse}
                  className={styles.addTagButton}
                >
                  <Plus size={18} /> Adicionar
                </button>
              </div>

              <div className={styles.tagsContainer}>
                {interesses.length === 0 ? (
                  <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                    Nenhum interesse cadastrado ainda.
                  </span>
                ) : (
                  interesses.map((tag) => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => removerInteresse(tag)}
                        className={styles.removeTag}
                        title={`Remover ${tag}`}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={salvando}
              className={styles.saveButton}
            >
              <Save size={18} />
              <span>{salvando ? "Salvando Alterações..." : "Salvar Perfil"}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
