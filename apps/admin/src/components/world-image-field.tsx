"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { useSession } from "@/lib/session";

/**
 * Um campo de imagem do mundo: banner ou foto quadrada.
 *
 * O arquivo vai para a nossa API (`POST /worlds/{id}/images/{kind}`), que valida
 * e grava no R2. **A tela não valida dimensão**: o `accept` do input é conforto,
 * e quem decide se a foto é quadrada é o servidor — que é quem vê os bytes. Erro
 * de validação volta com código e mensagem, e aparece aqui como veio.
 *
 * O upload NÃO grava no mundo: ele devolve a chave do objeto, e quem associa é o
 * `world:set-identity`. Por isso o componente avisa o pai com a chave, e o pai
 * decide quando salvar.
 */
export function WorldImageField({
  worldId,
  kind,
  label,
  hint,
  currentUrl,
  aspect,
  onUploaded,
  onCleared,
}: {
  worldId: string;
  kind: "banner" | "square-photo";
  label: string;
  hint: string;
  currentUrl: string | null;
  aspect: "banner" | "square";
  onUploaded: (key: string, url: string) => void;
  onCleared: () => void;
}) {
  const { authorizedFetch } = useSession();
  const { error: showError } = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function send(file: File) {
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      // Fora do SDK porque o client só fala JSON, e o boundary do multipart quem
      // compõe é o browser. Mas passa pelo `authorizedFetch`, que carrega o token
      // e derruba a sessão em 401 — a mesma garantia que o `api` dá, sem esta
      // tela ter de lembrar dela. Sem isso, token morto virava erro vermelho aqui
      // enquanto o resto do app seguia achando a sessão viva.
      const response = await authorizedFetch(
        `/api/v1/worlds/${worldId}/images/${kind}`,
        { method: "POST", body },
      );
      const payload = (await response.json()) as {
        key?: string;
        url?: string;
        width?: number;
        height?: number;
        code?: string;
        messageKey?: string;
      };
      if (
        !response.ok ||
        payload.key === undefined ||
        payload.url === undefined
      ) {
        // A mensagem do servidor diz o tamanho recebido ("recebi 900×400"), que
        // é a informação que resolve o problema. Trocá-la por "falha no upload"
        // deixaria o operador adivinhando.
        showError(payload.messageKey ?? payload.code ?? "Falha no upload.");
        return;
      }
      onUploaded(payload.key, payload.url);
    } catch {
      showError("Falha na API");
    } finally {
      setBusy(false);
      if (input.current !== null) input.current.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>

      <div
        className={`relative overflow-hidden rounded-sm border border-border bg-surface-2/40 ${
          aspect === "banner" ? "aspect-[3/1]" : "aspect-square w-40"
        }`}
      >
        {currentUrl === null ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            sem imagem
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- o CDN é externo
          // e o otimizador do Next exigiria configurar o domínio remoto; para o
          // preview do admin, a tag crua basta.
          <img
            src={currentUrl}
            alt={label}
            className="h-full w-full object-cover"
          />
        )}
      </div>

      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file !== undefined) void send(file);
        }}
      />

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          <ImagePlus className="size-4" />
          {busy ? "Enviando…" : currentUrl === null ? "Escolher" : "Trocar"}
        </Button>
        {currentUrl === null ? null : (
          <Button variant="ghost" onClick={onCleared} disabled={busy}>
            <Trash2 className="size-4" />
            Remover
          </Button>
        )}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}
