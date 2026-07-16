import { useCallback, useEffect, useRef, useState } from "react";
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
import { useSSO, useSignIn } from "@clerk/expo";

import { useSession } from "@/lib/session";
import { color, display, fontSize, fontWeight, space } from "@/theme";
import {
  canSubmitLogin,
  deriveLoginStep,
  mapLoginError,
  validateLoginForm,
  type FieldError,
  type LoginForm,
} from "./login-model";

const EMPTY: LoginForm = { email: "", password: "" };

function errorFor(
  errors: readonly FieldError[],
  field: FieldError["field"],
): string | null {
  return errors.find((e) => e.field === field)?.messageKey ?? null;
}

/** M-LOGIN (MF-00): autentica no Clerk (R-171) e roteia. */
export function Login() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const { startSSOFlow } = useSSO();
  const { status: connection } = useSession();

  const [form, setForm] = useState<LoginForm>(EMPTY);
  const [errors, setErrors] = useState<readonly FieldError[]>([]);
  const [showValidation, setShowValidation] = useState(false);

  const online = connection !== "offline";
  const busy = fetchStatus === "fetching";
  const step = deriveLoginStep(signIn?.status ?? null);

  const visible = showValidation
    ? [...validateLoginForm(form), ...errors]
    : errors;

  const patch = useCallback((next: Partial<LoginForm>) => {
    setForm((current) => ({ ...current, ...next }));
    setErrors([]);
  }, []);

  const submit = useCallback(async () => {
    setShowValidation(true);
    if (!canSubmitLogin(form, busy ? "fetching" : "idle", online)) return;

    const attempt = await signIn.password({
      identifier: form.email.trim(),
      password: form.password,
    });
    if (attempt.error) setErrors(mapLoginError(attempt.error));
    // Sucesso não navega aqui: vira `complete` e o efeito finaliza.
  }, [busy, form, online, signIn]);

  const finalizing = useRef(false);
  useEffect(() => {
    if (step !== "complete" || finalizing.current) return;
    finalizing.current = true;
    void (async () => {
      const done = await signIn.finalize();
      if (done.error) {
        setErrors(mapLoginError(done.error));
        finalizing.current = false;
        return;
      }
      router.replace("/");
    })();
  }, [router, signIn, step]);

  const withGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri({ scheme: "grinta" }),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
        router.replace("/");
      }
    } catch (e) {
      setErrors(mapLoginError(e));
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

        {step === "complete" ? (
          <>
            <Text style={styles.heading}>ENTRANDO…</Text>
            {formError === null ? null : (
              <Text style={styles.formError}>{formError}</Text>
            )}
          </>
        ) : step === "needs-mfa" ? (
          <>
            <Text style={styles.heading}>VERIFICAÇÃO EM DUAS ETAPAS</Text>
            {/* Não fingimos sucesso: a conta exige um segundo fator e esta tela
                ainda não o implementa. */}
            <Text style={styles.help}>
              Esta conta exige um segundo fator, que este app ainda não pede.
              Entre pelo painel web para continuar.
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.heading}>ENTRAR</Text>

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
              autoComplete="current-password"
              error={errorFor(visible, "password")}
            />

            {formError === null ? null : (
              <Text style={styles.formError}>{formError}</Text>
            )}
            {online ? null : (
              <Text style={styles.offline}>
                Sem conexão. Entrar exige rede.
              </Text>
            )}

            <Primary
              label={busy ? "ENTRANDO…" : "ENTRAR"}
              onPress={() => void submit()}
              disabled={busy || !online}
            />

            <Text style={styles.or}>OU</Text>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Continuar com Google"
              style={styles.secondary}
              onPress={() => void withGoogle()}
              disabled={busy || !online}
            >
              <Text style={styles.secondaryText}>CONTINUAR COM GOOGLE</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/cadastro")}
            >
              <Text style={styles.link}>Criar conta</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push("/recuperar")}
            >
              <Text style={styles.link}>Esqueci a senha</Text>
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
  heading: { ...display, fontSize: fontSize.lg, marginTop: space.lg },
  help: { color: color.textMuted, fontSize: fontSize.sm, lineHeight: 20 },
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
  offline: { color: color.warning, fontSize: fontSize.xs },
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
