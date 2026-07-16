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
import { useSignIn } from "@clerk/expo";

import { color, display, fontSize, fontWeight, space } from "@/theme";
import {
  deriveRecoverStep,
  isIdentifierNotFound,
  mapRecoverError,
  validateNewPassword,
  validateRecoverEmail,
  type FieldError,
} from "./recover-model";

function errorFor(
  errors: readonly FieldError[],
  field: FieldError["field"],
): string | null {
  return errors.find((e) => e.field === field)?.messageKey ?? null;
}

/**
 * M-RECOVER: redefine o acesso. O Clerk envia o código e guarda a credencial
 * (R-171). A confirmação é neutra por exigência do doc — ver recover-model.
 */
export function Recover() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<readonly FieldError[]>([]);

  const busy = fetchStatus === "fetching";
  // `isLoaded` primeiro: enquanto o Clerk carrega, `isSignedIn` é indefinido e
  // tratá-lo como "fora" deixaria o formulário piscar antes do guard.
  const step = deriveRecoverStep(signIn?.status ?? null, sent);

  const request = useCallback(async () => {
    const local = validateRecoverEmail(email);
    if (local.length > 0) {
      setErrors(local);
      return;
    }
    setErrors([]);

    const created = await signIn.create({ identifier: email.trim() });
    if (created.error) {
      // Conta inexistente segue para o passo do código com a mesma mensagem:
      // a tela não pode denunciar quem tem conta.
      if (!isIdentifierNotFound(created.error)) {
        setErrors(mapRecoverError(created.error));
        return;
      }
      setSent(true);
      return;
    }

    const sendResult = await signIn.resetPasswordEmailCode.sendCode();
    if (sendResult.error && !isIdentifierNotFound(sendResult.error)) {
      setErrors(mapRecoverError(sendResult.error));
      return;
    }
    setSent(true);
  }, [email, signIn]);

  const submitNewPassword = useCallback(async () => {
    const local = validateNewPassword(code, password);
    if (local.length > 0) {
      setErrors(local);
      return;
    }
    setErrors([]);

    const verified = await signIn.resetPasswordEmailCode.verifyCode({ code });
    if (verified.error) {
      setErrors(mapRecoverError(verified.error));
      return;
    }
    const submitted = await signIn.resetPasswordEmailCode.submitPassword({
      password,
    });
    if (submitted.error) setErrors(mapRecoverError(submitted.error));
  }, [code, password, signIn]);

  // Mesmo padrão do M-SIGNUP: `finalize` roda uma vez ao completar, e o
  // sucesso navega daqui — não de dentro do submit.
  const finalizing = useRef(false);
  useEffect(() => {
    if (step !== "complete" || finalizing.current) return;
    finalizing.current = true;
    void (async () => {
      const done = await signIn.finalize();
      if (done.error) {
        setErrors(mapRecoverError(done.error));
        finalizing.current = false;
        return;
      }
      router.replace("/");
    })();
  }, [router, signIn, step]);

  const formError = errorFor(errors, "form");

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
          <Text style={styles.heading}>SENHA REDEFINIDA</Text>
          <Text style={styles.help}>Entrando…</Text>
          {formError === null ? null : (
            <Text style={styles.formError}>{formError}</Text>
          )}
        </>
      ) : step === "reset" ? (
        <>
          <Text style={styles.heading}>DEFINA A NOVA SENHA</Text>
          {/* Neutra de propósito: não diz se a conta existe. */}
          <Text style={styles.help}>
            Se houver uma conta para {email.trim()}, enviamos um código.
          </Text>

          <Field
            label="CÓDIGO"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            error={errorFor(errors, "code")}
          />
          <Field
            label="NOVA SENHA"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            error={errorFor(errors, "password")}
          />

          {formError === null ? null : (
            <Text style={styles.formError}>{formError}</Text>
          )}

          <Primary
            label={busy ? "REDEFININDO…" : "REDEFINIR SENHA"}
            onPress={() => void submitNewPassword()}
            disabled={busy}
          />
        </>
      ) : (
        <>
          <Text style={styles.heading}>RECUPERAR ACESSO</Text>
          <Text style={styles.help}>
            Informe seu e-mail e enviaremos um código para você definir uma nova
            senha.
          </Text>

          <Field
            label="E-MAIL"
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors([]);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={errorFor(errors, "email")}
          />

          {formError === null ? null : (
            <Text style={styles.formError}>{formError}</Text>
          )}

          <Primary
            label={busy ? "ENVIANDO…" : "ENVIAR CÓDIGO"}
            onPress={() => void request()}
            disabled={busy}
          />
        </>
      )}

      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/entrar")}
      >
        <Text style={styles.link}>Voltar para entrar</Text>
      </Pressable>
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
  help: {
    color: color.textMuted,
    fontSize: fontSize.sm,
    marginBottom: space.sm,
    lineHeight: 20,
  },
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
  link: {
    color: color.primary,
    fontSize: fontSize.sm,
    textAlign: "center",
    paddingVertical: space.md,
  },
});
