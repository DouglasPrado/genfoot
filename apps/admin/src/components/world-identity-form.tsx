"use client";

import { GrintaApiError } from "@grinta/api-client";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WorldImageField } from "@/components/world-image-field";
import {
  DESCRIPTION_MAX,
  identityPayload,
  identityViolations,
  NAME_MAX,
} from "@/lib/world-identity-model";
import { useSession } from "@/lib/session";

/**
 * Nome e descrição do mundo.
 *
 * Só dispara o command quando algo mudou de fato — a decisão mora em
 * `identityPayload`, com teste. Cliente não-autoritativo: o contador de
 * caracteres e o aviso de limite são cortesia, e quem valida é o agregado.
 */
export function WorldIdentityForm({
  worldId,
  name,
  description,
  bannerKey,
  bannerUrl,
  squarePhotoKey,
  squarePhotoUrl,
  expectedVersion,
  seed,
  onSaved,
}: {
  worldId: string;
  name: string | null;
  description: string | null;
  bannerKey: string | null;
  bannerUrl: string | null;
  squarePhotoKey: string | null;
  squarePhotoUrl: string | null;
  expectedVersion: number | null;
  seed: string | null;
  onSaved: () => void;
}) {
  const { api } = useSession();
  const [draft, setDraft] = useState({
    name: name ?? "",
    description: description ?? "",
    bannerKey,
    squarePhotoKey,
  });
  // A URL do upload recém-feito, antes de salvar: o objeto já existe no R2, mas
  // o mundo ainda não aponta para ele. Sem isto o preview só apareceria depois
  // do Salvar, e o operador não veria o que escolheu.
  const [preview, setPreview] = useState<{
    banner: string | null;
    photo: string | null;
  }>({ banner: null, photo: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // O mundo pode mudar por fora (outra aba, outro operador, o refresh depois de
  // uma transição). Sem isto, o formulário seguiria mostrando o rascunho velho
  // como se fosse o estado do servidor.
  useEffect(() => {
    setDraft({
      name: name ?? "",
      description: description ?? "",
      bannerKey,
      squarePhotoKey,
    });
    setPreview({ banner: null, photo: null });
  }, [name, description, bannerKey, squarePhotoKey]);

  const payload = identityPayload(
    { name, description, bannerKey, squarePhotoKey },
    draft,
  );
  const violations = identityViolations(draft);
  const nameViolation = violations.find((v) => v.field === "name");
  const descriptionViolation = violations.find((v) => v.field === "description");

  async function save() {
    if (payload === null || violations.length > 0) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const response = await api.command({
        commandType: "world:set-identity",
        worldId,
        payload,
        idempotencyKey: `identity-${Math.random().toString(36).slice(2, 10)}`,
        ...(expectedVersion === null ? {} : { expectedVersion }),
      });
      if (response.status === "REJECTED") {
        setError(response.error?.code ?? "REJECTED");
        return;
      }
      setSaved(true);
      onSaved();
    } catch (err) {
      setError(
        err instanceof GrintaApiError ? err.standard.code : "Falha na API",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="world-name">Nome</Label>
          <span
            className={`mono text-[11px] ${
              nameViolation ? "text-danger" : "text-muted-foreground"
            }`}
          >
            {draft.name.trim().length}/{NAME_MAX}
          </span>
        </div>
        <Input
          id="world-name"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder={seed ?? "sem nome"}
        />
        {nameViolation ? (
          <p className="text-[11px] text-danger">{nameViolation.message}</p>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {/* Sem nome não é erro: o mundo cai no seed, que é o que a tela
                sempre mostrou. Deixar em branco é uma escolha legítima. */}
            Em branco, o mundo aparece pelo seed (
            <span className="mono">{seed ?? "—"}</span>).
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor="world-description">Descrição</Label>
          <span
            className={`mono text-[11px] ${
              descriptionViolation ? "text-danger" : "text-muted-foreground"
            }`}
          >
            {draft.description.trim().length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <textarea
          id="world-description"
          value={draft.description}
          onChange={(e) =>
            setDraft((d) => ({ ...d, description: e.target.value }))
          }
          rows={3}
          className="w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:border-primary"
          placeholder="Para que serve este mundo, quem joga, o que está sendo testado…"
        />
        {descriptionViolation ? (
          <p className="text-[11px] text-danger">
            {descriptionViolation.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
        <WorldImageField
          worldId={worldId}
          kind="banner"
          label="Banner"
          hint="Paisagem, mínimo 600×200. PNG, JPEG ou WebP até 5 MB."
          aspect="banner"
          currentUrl={
            draft.bannerKey === null ? null : (preview.banner ?? bannerUrl)
          }
          onUploaded={(key, url) => {
            setDraft((d) => ({ ...d, bannerKey: key }));
            setPreview((p) => ({ ...p, banner: url }));
          }}
          onCleared={() => {
            setDraft((d) => ({ ...d, bannerKey: null }));
            setPreview((p) => ({ ...p, banner: null }));
          }}
        />
        <WorldImageField
          worldId={worldId}
          kind="square-photo"
          label="Foto quadrada"
          hint="Quadrada, mínimo 128×128."
          aspect="square"
          currentUrl={
            draft.squarePhotoKey === null
              ? null
              : (preview.photo ?? squarePhotoUrl)
          }
          onUploaded={(key, url) => {
            setDraft((d) => ({ ...d, squarePhotoKey: key }));
            setPreview((p) => ({ ...p, photo: url }));
          }}
          onCleared={() => {
            setDraft((d) => ({ ...d, squarePhotoKey: null }));
            setPreview((p) => ({ ...p, photo: null }));
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={() => void save()}
          disabled={busy || payload === null || violations.length > 0}
        >
          {busy ? "Salvando…" : "Salvar"}
        </Button>
        {/* O botão desabilitado sem explicação faz o operador achar que quebrou.
            Dizer "nada mudou" é a diferença entre um bug e um estado. */}
        {payload === null && violations.length === 0 ? (
          <span className="text-xs text-muted-foreground">
            {saved ? (
              <span className="flex items-center gap-1.5 text-[color:var(--ok)]">
                <Check className="size-3.5" />
                Salvo.
              </span>
            ) : (
              "Nada mudou."
            )}
          </span>
        ) : null}
      </div>

      {error !== null ? (
        <p className="mono rounded-sm border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
