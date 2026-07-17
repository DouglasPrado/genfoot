"use client";

import { GrintaApiError } from "@grinta/api-client";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSession } from "@/lib/session";

/**
 * Apagar o mundo. Irreversível.
 *
 * **Não é arquivar.** A R-56 define o arquivamento: o mundo vai a read-only,
 * "histórico, títulos e recordes preservados", REVERSÍVEL por decisão
 * administrativa — e com 30 dias de aviso prévio aos usuários com vínculo. O
 * canon tem só essa operação. Apagar é ferramenta de operação, não regra de
 * jogo, e por isso o comando recusa mundo com gestor ativo: destruir sem aviso o
 * mundo onde alguém tem clube é pior que aquilo que a R-56 já protege.
 *
 * **As duas confirmações não são iguais.** O nome e o uuid digitados aqui são
 * para o OPERADOR — obrigam a olhar o que se vai apagar. Mas quem impede o
 * acidente é o servidor: o comando exige `confirmSeed` e o compara com o seed do
 * mundo. Confirmação que só existe no modal não protege nada — um script, um
 * curl ou um bug de outra tela apagaria o mundo sem digitar coisa alguma.
 */
export function DeleteWorldDialog({
  worldId,
  seed,
  clubCount,
}: {
  worldId: string;
  seed: string;
  clubCount: number;
}) {
  const { api } = useSession();
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [uuid, setUuid] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Os dois têm de bater. Comparar com `trim()` porque copiar de uma tabela traz
  // espaço junto, e recusar por espaço invisível é raiva sem motivo.
  const confere = nome.trim() === seed && uuid.trim() === worldId;

  async function apagar() {
    if (!confere) return;
    setBusy(true);
    setErro(null);
    try {
      const r = await api.command({
        commandType: "world:delete",
        worldId,
        payload: { confirmSeed: nome.trim() },
        idempotencyKey: `delete-${worldId}`,
      });
      if (r.status === "REJECTED") {
        setErro(r.error?.messageKey ?? r.error?.code ?? "REJECTED");
        return;
      }
      setAberto(false);
      // O mundo não existe mais: ficar na página dele daria 404 na próxima
      // query. `replace` e não `push` — não há para onde "voltar".
      router.replace("/worlds");
    } catch (err) {
      setErro(err instanceof GrintaApiError ? err.standard.code : "Falha na API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(open) => {
        setAberto(open);
        // Fechar limpa: reabrir com o nome já digitado deixaria o botão de
        // apagar ARMADO atrás de um clique.
        if (!open) {
          setNome("");
          setUuid("");
          setErro(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger">
          <Trash2 className="size-4" />
          Apagar mundo
        </Button>
      </DialogTrigger>
      <DialogContent>
        <div className="space-y-1.5">
          <DialogTitle>
            <span className="flex items-center gap-2 text-danger">
              <TriangleAlert className="size-4" />
              Apagar o mundo
            </span>
          </DialogTitle>
          <DialogDescription>
            Isto apaga o mundo e <strong>tudo que pende dele</strong> —{" "}
            {clubCount} clubes, identidades, estádios, participações, controles e
            a cadeia de eventos. <strong>Não tem desfazer</strong>, e não é o
            mesmo que arquivar: arquivar preserva histórico e é reversível
            (R-56).
          </DialogDescription>
        </div>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="confirmNome">
              Digite o nome do mundo:{" "}
              <span className="mono text-foreground">{seed}</span>
            </Label>
            <Input
              id="confirmNome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mono"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmUuid">
              Digite o UUID:{" "}
              <span className="mono text-[10px] text-foreground">{worldId}</span>
            </Label>
            <Input
              id="confirmUuid"
              value={uuid}
              onChange={(e) => setUuid(e.target.value)}
              className="mono text-xs"
              autoComplete="off"
            />
          </div>

          {erro === null ? null : (
            <p className="mono rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
              {erro}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void apagar()}
              disabled={!confere || busy}
              className="bg-danger text-white hover:bg-danger/90"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              Apagar para sempre
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
