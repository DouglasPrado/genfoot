import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as AuthSession from "expo-auth-session";
import { useAuth, useSSO, useSignUp } from "@clerk/expo";

import { color, display, fontSize, fontWeight, space } from "@/theme";
import {
  canSubmitSignup,
  deriveSignupStep,
  mapClerkError,
  validateSignupForm,
  type FieldError,
  type SignupForm,
} from "./signup-model";

const EMPTY: SignupForm = {
  name: "",
  email: "",
  password: "",
  acceptedTerms: false,
};

function errorFor(
  errors: readonly FieldError[],
  field: FieldError["field"],
): string | null {
  return errors.find((e) => e.field === field)?.messageKey ?? null;
}

/**
 * M-SIGNUP (MF-00/MF-01): cria a conta no Clerk (R-171). O aceite de termos é
 * nosso; credencial, unicidade de e-mail e envio do código são do provedor.
 */
export function Signup() {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const { startSSOFlow } = useSSO();
  const { isLoaded, isSignedIn, signOut } = useAuth();

  const [form, setForm] = useState<SignupForm>(EMPTY);
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<readonly FieldError[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const step = deriveSignupStep(
    signUp === null || signUp === undefined
      ? null
      : {
          status: signUp.status,
          unverifiedFields: signUp.unverifiedFields,
          emailAddress: signUp.emailAddress,
        },
  );
  // O e-mail vem do cadastro em curso, não do formulário: se o app reabrir no
  // meio do fluxo, o formulário está vazio mas o cadastro ainda tem o e-mail.
  const pendingEmail = signUp?.emailAddress ?? form.email.trim();
  const busy = fetchStatus === "fetching";

  const localErrors = useMemo(() => validateSignupForm(form), [form]);
  const visible = showValidation ? [...localErrors, ...errors] : errors;

  const patch = useCallback((next: Partial<SignupForm>) => {
    setForm((current) => ({ ...current, ...next }));
    setErrors([]);
  }, []);

  const submit = useCallback(async () => {
    setShowValidation(true);
    if (!canSubmitSignup(form, busy ? "fetching" : "idle")) return;

    const created = await signUp.password({
      emailAddress: form.email.trim(),
      password: form.password,
      ...(form.name.trim() === "" ? {} : { firstName: form.name.trim() }),
    });
    if (created.error) {
      setErrors(mapClerkError(created.error));
      return;
    }

    const sent = await signUp.verifications.sendEmailCode();
    if (sent.error) setErrors(mapClerkError(sent.error));
  }, [busy, form, signUp]);

  const confirmCode = useCallback(async () => {
    const verified = await signUp.verifications.verifyEmailCode({ code });
    if (verified.error) setErrors(mapClerkError(verified.error));
    // Sucesso não navega aqui: o status vira `complete` e o efeito abaixo
    // finaliza. Assim o cadastro concluído por qualquer caminho (código,
    // retomada) termina igual.
  }, [code, signUp]);

  // `finalize` converte o cadastro completo em sessão ativa. Roda uma vez só:
  // sem a trava, cada re-render dispararia outra tentativa.
  const finalizing = useRef(false);
  useEffect(() => {
    if (step !== "complete" || finalizing.current) return;
    finalizing.current = true;
    void (async () => {
      const done = await signUp.finalize();
      if (done.error) {
        setErrors(mapClerkError(done.error));
        finalizing.current = false;
        return;
      }
      router.replace("/");
    })();
  }, [router, signUp, step]);

  const withGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "grinta" }),
      });
      // SSO não usa finalize(): a sessão vem pronta e é ativada aqui.
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (e) {
      setErrors(mapClerkError(e));
    }
  }, [router, startSSOFlow]);

  const formError = errorFor(visible, "form");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.logo}>GRINTA</Text>

      {isLoaded && isSignedIn && step !== "complete" ? (
        <>
          <Text style={styles.heading}>VOCÊ JÁ ESTÁ CONECTADO</Text>
          <Text style={styles.help}>
            Já existe uma conta ativa neste aparelho. Saia antes de criar outra.
          </Text>
          <Primary
            label="SAIR"
            onPress={() => void signOut()}
            disabled={!isLoaded}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
          >
            <Text style={styles.link}>Voltar ao app</Text>
          </Pressable>
        </>
      ) : step === "complete" ? (
        <>
          <Text style={styles.heading}>CONTA CRIADA</Text>
          <Text style={styles.help}>Entrando…</Text>
          {/* Se `finalize` falhar, o erro aparece aqui — antes esta tela caía
              no formulário e o erro sumia. */}
          {formError === null ? null : (
            <>
              <Text style={styles.formError}>{formError}</Text>
              <Primary
                label="TENTAR DE NOVO"
                onPress={() => {
                  finalizing.current = false;
                  setErrors([]);
                }}
                disabled={busy}
              />
            </>
          )}
        </>
      ) : step === "verify-email" ? (
        <>
          <Text style={styles.heading}>CONFIRME SEU E-MAIL</Text>
          <Text style={styles.help}>Enviamos um código para {pendingEmail}.</Text>

          <Field
            label="CÓDIGO"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            error={errorFor(visible, "code")}
          />

          {formError === null ? null : <Text style={styles.formError}>{formError}</Text>}

          <Primary
            label={busy ? "CONFIRMANDO…" : "CONFIRMAR"}
            onPress={() => void confirmCode()}
            disabled={busy || code.trim() === ""}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() => void signUp.verifications.sendEmailCode()}
            disabled={busy}
          >
            <Text style={styles.link}>Reenviar código</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.heading}>CRIAR CONTA</Text>

          <Field
            label="NOME (OPCIONAL)"
            value={form.name}
            onChangeText={(v) => patch({ name: v })}
            autoComplete="name"
            error={errorFor(visible, "name")}
          />
          <Field
            label="E-MAIL"
            value={form.email}
            onChangeText={(v) => patch({ email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errorFor(visible, "email")}
          />
          <Field
            label="SENHA"
            value={form.password}
            onChangeText={(v) => patch({ password: v })}
            secureTextEntry
            autoComplete="new-password"
            error={errorFor(visible, "password")}
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: form.acceptedTerms }}
            accessibilityLabel="Aceito os termos de uso e a política de privacidade"
            style={styles.terms}
            onPress={() => patch({ acceptedTerms: !form.acceptedTerms })}
          >
            <View
              style={[styles.box, form.acceptedTerms ? styles.boxOn : null]}
            />
            <Text style={styles.termsText}>
              Aceito os termos de uso e a política de privacidade.
            </Text>
          </Pressable>
          {errorFor(visible, "acceptedTerms") === null ? null : (
            <Text style={styles.fieldError}>
              {errorFor(visible, "acceptedTerms")}
            </Text>
          )}

          {formError === null ? null : <Text style={styles.formError}>{formError}</Text>}

          {/* Bot protection está ligada na instância (captcha smart): sem este
              ponto de montagem o cadastro falha. */}
          <View nativeID="clerk-captcha" />

          <Primary
            label={busy ? "CRIANDO…" : "CRIAR CONTA"}
            onPress={() => void submit()}
            disabled={busy}
          />

          <Text style={styles.or}>OU</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuar com Google"
            style={styles.secondary}
            onPress={() => void withGoogle()}
            disabled={busy}
          >
            <Text style={styles.secondaryText}>CONTINUAR COM GOOGLE</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/entrar")}
          >
            <Text style={styles.link}>Já tenho conta</Text>
          </Pressable>
        </>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  error,
  ...input
}: {
  label: string;
  error: string | null;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={color.textFaint}
        style={[styles.input, error === null ? null : styles.inputError]}
        {...input}
      />
      {error === null ? null : <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function Primary({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={[styles.button, disabled ? styles.buttonOff : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.background },
  root: { flex: 1, backgroundColor: color.background },
  content: { padding: space.lg, gap: space.md, paddingBottom: space.xl4 },
  logo: { ...display, fontSize: 32, letterSpacing: 1.5, textAlign: "center" },
  heading: {
    ...display,
    fontSize: fontSize.lg,
    marginTop: space.lg,
    marginBottom: space.xs,
  },
  help: { color: color.textMuted, fontSize: fontSize.sm, marginBottom: space.sm },
  field: { gap: space.xs },
  label: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    letterSpacing: 0.8,
    fontWeight: fontWeight.bold as "700",
  },
  input: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 4,
    paddingHorizontal: space.md,
    minHeight: 48,
    color: color.text,
    fontSize: fontSize.md,
  },
  inputError: { borderColor: color.danger },
  fieldError: { color: color.danger, fontSize: fontSize.xs },
  formError: {
    color: color.danger,
    fontSize: fontSize.sm,
    backgroundColor: color.surface,
    borderLeftWidth: 3,
    borderLeftColor: color.danger,
    padding: space.md,
    borderRadius: 4,
  },
  terms: { flexDirection: "row", alignItems: "center", gap: space.sm, minHeight: 44 },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: color.borderStrong,
  },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  termsText: { color: color.textMuted, fontSize: fontSize.sm, flex: 1 },
  button: {
    backgroundColor: color.primary,
    borderRadius: 4,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.sm,
  },
  buttonOff: { opacity: 0.4 },
  buttonText: {
    color: color.primaryContrast,
    fontWeight: fontWeight.bold as "700",
    fontSize: fontSize.md,
    letterSpacing: 0.5,
  },
  or: {
    color: color.textFaint,
    fontSize: fontSize.xs,
    textAlign: "center",
    letterSpacing: 1,
  },
  secondary: {
    borderWidth: 1,
    borderColor: color.borderStrong,
    borderRadius: 4,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    color: color.text,
    fontWeight: fontWeight.bold as "700",
    fontSize: fontSize.sm,
    letterSpacing: 0.5,
  },
  link: {
    color: color.primary,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: space.md,
  },
});
